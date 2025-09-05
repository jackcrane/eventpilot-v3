import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { z } from "zod";
import { zerialize } from "zodex";
import { serializeError } from "#serializeError";
import { collapseCrmValues } from "..";

// Iteration spec: current (from X-Instance header), previous (relative to current),
// a specific instanceId, a calendar year (if unique), or an instance by name
const iterationSpec = z.discriminatedUnion("type", [
  z.object({ type: z.literal("current") }),
  z.object({ type: z.literal("previous") }),
  z.object({ type: z.literal("specific"), instanceId: z.string().min(1) }),
  z.object({ type: z.literal("year"), year: z.number().int().gte(1970).lte(2100) }),
  z.object({ type: z.literal("name"), name: z.string().min(1) }),
]);

// Participant filter options
const participantFilter = z.object({
  tierId: z.string().optional(),
  tierName: z.string().optional(),
  periodId: z.string().optional(),
  periodName: z.string().optional(),
});

// Volunteer filter options
const volunteerFilter = z.object({
  minShifts: z.number().int().nonnegative().optional(),
});

// Involvement condition
const involvementCondition = z.object({
  type: z.literal("involvement"),
  role: z.enum(["participant", "volunteer"]),
  iteration: iterationSpec,
  exists: z.boolean().default(true),
  participant: participantFilter.optional(),
  volunteer: volunteerFilter.optional(),
});

// Transition condition: e.g., Half last iteration -> Full this iteration
const transitionCondition = z.object({
  type: z.literal("transition"),
  from: involvementCondition
    .omit({ exists: true })
    .extend({ exists: z.literal(true).default(true) }),
  to: involvementCondition
    .omit({ exists: true })
    .extend({ exists: z.literal(true).default(true) }),
});

// Group node for AND/OR composition
const groupNode = z.lazy(() =>
  z.object({
    type: z.literal("group"),
    op: z.enum(["and", "or"]).default("and"),
    not: z.boolean().optional(),
    conditions: z
      .array(z.union([involvementCondition, transitionCondition, groupNode]))
      .min(1),
  })
);

// Root schema
export const segmentSchema = z.object({
  filter: z.union([groupNode, involvementCondition, transitionCondition]),
  debug: z.boolean().optional().default(false),
});

// Utility: resolve instanceIds from iteration spec (strict; throws on missing)
const resolveInstanceIdsOrThrow = async ({ iteration, eventId, currentInstanceId }) => {
  if (iteration.type === "current") {
    if (!currentInstanceId)
      throw { status: 400, message: "X-Instance header is required when using iteration.type=\"current\"." };
    const current = await prisma.eventInstance.findUnique({ where: { id: currentInstanceId } });
    if (!current || current.eventId !== eventId)
      throw { status: 400, message: "X-Instance does not reference a valid instance for this event." };
    return [currentInstanceId];
  }
  if (iteration.type === "specific") {
    const inst = await prisma.eventInstance.findUnique({ where: { id: iteration.instanceId } });
    if (!inst || inst.eventId !== eventId)
      throw { status: 400, message: `Specific instanceId not found for this event: ${iteration.instanceId}` };
    return [inst.id];
  }
  if (iteration.type === "year") {
    const start = new Date(Date.UTC(iteration.year, 0, 1, 0, 0, 0));
    const end = new Date(Date.UTC(iteration.year + 1, 0, 1, 0, 0, 0));
    const instances = await prisma.eventInstance.findMany({
      where: {
        eventId,
        deleted: false,
        startTime: { gte: start, lt: end },
      },
      select: { id: true },
      orderBy: { startTime: "asc" },
    });
    if (!instances.length)
      throw { status: 400, message: `No instances found for year ${iteration.year}.` };
    if (instances.length > 1)
      throw { status: 400, message: `Multiple instances found in year ${iteration.year}. Use iteration.type=\"name\" or iteration.type=\"specific\".` };
    return [instances[0].id];
  }
  if (iteration.type === "name") {
    const instances = await prisma.eventInstance.findMany({
      where: { eventId, deleted: false, name: iteration.name },
      select: { id: true },
      orderBy: { startTime: "asc" },
    });
    if (!instances.length)
      throw { status: 400, message: `No instance found with name: ${iteration.name}` };
    if (instances.length > 1)
      throw { status: 400, message: `Multiple instances share the name: ${iteration.name}. Use iteration.type=\"specific\" with instanceId.` };
    return [instances[0].id];
  }
  // previous
  if (!currentInstanceId)
    throw { status: 400, message: "X-Instance header is required when using iteration.type=\"previous\"." };
  const current = await prisma.eventInstance.findUnique({ where: { id: currentInstanceId } });
  if (!current || current.eventId !== eventId)
    throw { status: 400, message: "X-Instance does not reference a valid instance for this event." };
  const previous = await prisma.eventInstance.findFirst({
    where: { eventId, deleted: false, startTime: { lt: current.startTime } },
    orderBy: { startTime: "desc" },
  });
  if (!previous)
    throw { status: 400, message: "No previous instance exists before the current instance." };
  return [previous.id];
};

// Fetch the universe of CRM people for this event
const getUniverse = async (eventId) => {
  const all = await prisma.crmPerson.findMany({
    where: { eventId, deleted: false },
    select: { id: true },
  });
  return new Set(all.map((p) => p.id));
};

// Set ops
const setUnion = (a, b) => {
  const out = new Set(a);
  for (const x of b) out.add(x);
  return out;
};
const setIntersect = (a, b) => {
  const out = new Set();
  // iterate over smaller set for perf
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const x of small) if (large.has(x)) out.add(x);
  return out;
};
const setDiff = (a, b) => {
  const out = new Set();
  for (const x of a) if (!b.has(x)) out.add(x);
  return out;
};

// Cache for repeated predicate lookups (by stable key)
const makePredicateCache = () => new Map();

const peopleForInvolvement = async ({
  cond,
  eventId,
  currentInstanceId,
  cache,
  debugInfo,
  path,
}) => {
  const resolvedInstanceIds = await resolveInstanceIdsOrThrow({
    iteration: cond.iteration,
    eventId,
    currentInstanceId,
  });

  const cacheKey = JSON.stringify({
    type: cond.type,
    role: cond.role,
    instanceIds: resolvedInstanceIds,
    participant: cond.participant || null,
    volunteer: cond.volunteer || null,
  });
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let ids = new Set();
  if (cond.role === "participant") {
    // Validate name-based filters if provided
    if (cond.participant?.tierName) {
      const tierCount = await prisma.registrationTier.count({
        where: { eventId, instanceId: { in: resolvedInstanceIds }, name: cond.participant.tierName },
      });
      if (!tierCount) {
        throw { status: 400, message: `Tier name not found for these instances: ${cond.participant.tierName}` };
      }
    }
    if (cond.participant?.periodName) {
      const periodCount = await prisma.registrationPeriod.count({
        where: { eventId, instanceId: { in: resolvedInstanceIds }, name: cond.participant.periodName },
      });
      if (!periodCount) {
        throw { status: 400, message: `Period name not found for these instances: ${cond.participant.periodName}` };
      }
    }
    const where = {
      eventId,
      instanceId: { in: resolvedInstanceIds },
      deleted: false,
      finalized: true,
      crmPersonId: { not: null },
      ...(cond.participant?.tierId
        ? { registrationTierId: cond.participant.tierId }
        : {}),
      ...(cond.participant?.tierName
        ? { registrationTier: { is: { name: cond.participant.tierName } } }
        : {}),
      ...(cond.participant?.periodId
        ? { registrationPeriodId: cond.participant.periodId }
        : {}),
      ...(cond.participant?.periodName
        ? { registrationPeriod: { is: { name: cond.participant.periodName } } }
        : {}),
    };
    const regs = await prisma.registration.findMany({
      where,
      select: { crmPersonId: true },
    });
    ids = new Set(regs.map((r) => r.crmPersonId).filter(Boolean));
  } else if (cond.role === "volunteer") {
    // Base: has a volunteer registration linked to a CRM person in this instance
    // Optionally enforce minShifts via length of related shifts
    const includeShifts =
      !!cond.volunteer?.minShifts && cond.volunteer.minShifts > 0;
    const forms = await prisma.volunteerRegistration.findMany({
      where: {
        eventId,
        instanceId: { in: resolvedInstanceIds },
        deleted: false,
        crmPersonLink: { isNot: null },
      },
      select: {
        crmPersonLink: { select: { crmPersonId: true } },
        ...(includeShifts ? { shifts: { select: { id: true } } } : {}),
      },
    });
    if (includeShifts) {
      for (const f of forms) {
        const count = f.shifts?.length || 0;
        if (count >= (cond.volunteer?.minShifts || 0)) {
          if (f.crmPersonLink?.crmPersonId)
            ids.add(f.crmPersonLink.crmPersonId);
        }
      }
    } else {
      for (const f of forms) {
        if (f.crmPersonLink?.crmPersonId) ids.add(f.crmPersonLink.crmPersonId);
      }
    }
  }

  cache.set(cacheKey, ids);
  if (debugInfo) {
    debugInfo.traces.push({
      path,
      nodeType: "involvement",
      role: cond.role,
      iteration: cond.iteration,
      resolvedInstanceIds,
      baseCount: ids.size,
    });
  }
  return ids;
};

const evaluateNode = async ({
  node,
  eventId,
  currentInstanceId,
  universe,
  cache,
  debugInfo,
  path = "root",
}) => {
  if (node.type === "involvement") {
    const base = await peopleForInvolvement({
      cond: node,
      eventId,
      currentInstanceId,
      cache,
      debugInfo,
      path,
    });
    const result = node.exists === false ? setDiff(universe, base) : base;
    if (debugInfo) {
      debugInfo.traces.push({
        path,
        nodeType: "involvement:result",
        exists: node.exists !== false,
        resultCount: result.size,
      });
    }
    return result;
  }

  if (node.type === "transition") {
    const fromSet = await peopleForInvolvement({
      cond: node.from,
      eventId,
      currentInstanceId,
      cache,
      debugInfo,
      path: `${path}.from`,
    });
    const toSet = await peopleForInvolvement({
      cond: node.to,
      eventId,
      currentInstanceId,
      cache,
      debugInfo,
      path: `${path}.to`,
    });
    const combined = setIntersect(fromSet, toSet);
    if (debugInfo) {
      debugInfo.traces.push({
        path,
        nodeType: "transition",
        fromCount: fromSet.size,
        toCount: toSet.size,
        resultCount: combined.size,
      });
    }
    return combined;
  }

  if (node.type === "group") {
    if (!node.conditions?.length) return new Set();
    const evaluated = [];
    for (let i = 0; i < node.conditions.length; i++) {
      const child = node.conditions[i];
      evaluated.push(
        await evaluateNode({
          node: child,
          eventId,
          currentInstanceId,
          universe,
          cache,
          debugInfo,
          path: `${path}.conditions[${i}]`,
        })
      );
    }
    const combined =
      node.op === "and"
        ? evaluated.reduce((acc, s) => setIntersect(acc, s))
        : evaluated.reduce((acc, s) => setUnion(acc, s));
    const result = node.not ? setDiff(universe, combined) : combined;
    if (debugInfo) {
      debugInfo.traces.push({
        path,
        nodeType: "group",
        op: node.op,
        not: !!node.not,
        childCounts: evaluated.map((s) => s.size),
        resultCount: result.size,
      });
    }
    return result;
  }

  return new Set();
};

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const currentInstanceId = req.instanceId || null;

    const parsed = segmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: serializeError(parsed) });
    }

    try {
      const payload = await evaluateSegment({
        eventId,
        currentInstanceId,
        filter: parsed.data.filter,
        debug: parsed.data.debug,
      });
      return res.json(payload);
    } catch (e) {
      console.error("[CRM SEGMENTS][POST] Error:", e);
      if (e?.status) {
        return res.status(e.status).json({ message: e.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  },
];

export const query = [
  verifyAuth(["manager"]),
  (req, res) => {
    return res.json(zerialize(segmentSchema));
  },
];

// Reusable evaluator for other routes (e.g., generative)
export const evaluateSegment = async ({ eventId, currentInstanceId, filter, debug }) => {
  const universe = await getUniverse(eventId);
  const cache = makePredicateCache();
  const debugInfo = debug
    ? {
        enabled: true,
        universeSize: universe.size,
        currentInstanceId,
        traces: [],
      }
    : null;

  const resultSet = await evaluateNode({
    node: filter,
    eventId,
    currentInstanceId,
    universe,
    cache,
    debugInfo,
  });

  const total = resultSet.size;

  const ids = Array.from(resultSet);
  const people = ids.length
    ? await prisma.crmPerson.findMany({
        where: { id: { in: ids }, eventId, deleted: false },
        include: { emails: true, phones: true, fieldValues: true },
        orderBy: [{ createdAt: "desc" }],
      })
    : [];

  const payload = {
    crmPersons: people.map((p) => ({ ...p, fields: collapseCrmValues(p.fieldValues) })),
    total,
  };
  if (debugInfo) payload.debug = debugInfo;
  return payload;
};
