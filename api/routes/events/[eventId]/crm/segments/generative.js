import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { z } from "zod";
import { zerialize } from "zodex";
import { serializeError } from "#serializeError";
import fs from "fs";
import path from "path";
import { segmentSchema, evaluateSegment } from "./index.js";
import { isOpenAIConfigured, createResponse, extractText } from "#util/openai";

// Input schema for the generative endpoint
export const generativeInputSchema = z.object({
  prompt: z.string().min(4),
  includeContext: z.boolean().default(true).optional(),
  debug: z.boolean().default(false).optional(),
});

// Config now centralized in #util/openai

let cachedInstructions = null;
const getInstructions = () => {
  if (cachedInstructions) return cachedInstructions;
  try {
    const p = path.resolve(process.cwd(), "../INSTRUCTIONS.md");
    const text = fs.readFileSync(p, "utf8");
    cachedInstructions = text;
    return text;
  } catch {
    return "";
  }
};

const safeJsonParse = (txt) => {
  try {
    return JSON.parse(txt);
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    // try to extract a JSON code block if present
    const m = txt.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
        // eslint-disable-next-line
      } catch (_) {}
    }
    return null;
  }
};

const buildContext = async (eventId) => {
  // Instances (id, name, year)
  const instances = await prisma.eventInstance.findMany({
    where: { eventId, deleted: false },
    select: { id: true, name: true, startTime: true, endTime: true },
    orderBy: { startTime: "asc" },
  });
  const instanceIds = instances.map((i) => i.id);
  const tiers = instanceIds.length
    ? await prisma.registrationTier.findMany({
        where: { eventId, instanceId: { in: instanceIds }, deleted: false },
        select: { id: true, name: true, instanceId: true },
      })
    : [];
  const periods = instanceIds.length
    ? await prisma.registrationPeriod.findMany({
        where: { eventId, instanceId: { in: instanceIds }, deleted: false },
        select: { id: true, name: true, instanceId: true },
      })
    : [];
  // Upsell items
  const upsells = instanceIds.length
    ? await prisma.upsellItem.findMany({
        where: { eventId, instanceId: { in: instanceIds }, deleted: false },
        select: { id: true, name: true, instanceId: true },
        orderBy: { name: "asc" },
      })
    : [];

  const byInstance = Object.fromEntries(
    instances.map((i) => [
      i.id,
      {
        id: i.id,
        name: i.name,
        year: i.startTime ? new Date(i.startTime).getUTCFullYear() : null,
        startTime: i.startTime,
        endTime: i.endTime,
        tiers: tiers
          .filter((t) => t.instanceId === i.id)
          .map(({ id, name }) => ({ id, name })),
        periods: periods
          .filter((p) => p.instanceId === i.id)
          .map(({ id, name }) => ({ id, name })),
        upsells: upsells
          .filter((u) => u.instanceId === i.id)
          .map(({ id, name }) => ({ id, name })),
      },
    ])
  );
  // Count instances by year to detect ambiguity for `year`
  const yearCounts = instances.reduce((acc, i) => {
    const y = i.startTime ? new Date(i.startTime).getUTCFullYear() : null;
    if (!y) return acc;
    acc.set(y, (acc.get(y) || 0) + 1);
    return acc;
  }, new Map());

  return {
    instances: instances.map((i) => ({
      id: i.id,
      name: i.name,
      year: i.startTime ? new Date(i.startTime).getUTCFullYear() : null,
    })),
    instanceDetail: byInstance,
    yearAmbiguity: Array.from(yearCounts.entries()).map(([year, count]) => ({
      year,
      count,
    })),
  };
};

// eslint-disable-next-line no-unused-vars
const createMessages = ({ instructions, prompt, context }) => {
  const guidance = [
    "You generate a JSON AST payload for the CRM Segments API.",
    "Output MUST be strict JSON (no markdown), matching the segmentSchema summarized below.",
    "Rules:",
    '- Prefer iteration.type="name" when multiple instances share a year.',
    '- Use iteration.type="year" ONLY if exactly one instance exists for that year.',
    '- Otherwise use iteration.type="specific" with instanceId.',
    "- Prefer participant.tierName/periodName when exact names are shown in context; use ids if names are ambiguous.",
    "- Do not invent instance names/ids, tier names/ids, or period names/ids.",
    "- Keep JSON minimal (omit unused optional fields).",
  ].join("\n");

  const sys = [
    guidance,
    "\n--- INSTRUCTIONS.md ---\n",
    instructions || "",
  ].join("\n");

  const user = [
    "Prompt:",
    prompt,
    "\nContext (instances, tiers, periods, and year ambiguity):\n",
    JSON.stringify(context, null, 2),
    "\nReturn ONLY the JSON AST: { filter, debug? }",
  ].join("\n");

  return [
    { role: "system", content: sys },
    { role: "user", content: user },
  ];
};

// Compose a single input string for OpenAI Responses API
const createInput = ({ instructions, prompt, context }) => {
  const now = new Date();
  const nowDateUTC = now.toISOString().slice(0, 10);
  const nowYear = now.getUTCFullYear();
  const lastYear = nowYear - 1;
  const parts = [
    "You generate a JSON AST payload for the CRM Segments API.",
    "Output MUST be strict JSON (no markdown), matching the segmentSchema summarized below.",
    "Rules:",
    '- Prefer iteration.type="name" when multiple instances share a year.',
    '- Use iteration.type="year" ONLY if exactly one instance exists for that year.',
    '- Otherwise use iteration.type="specific" with instanceId.',
    "- Prefer participant.tierName/periodName when exact names are shown in context; use ids if names are ambiguous.",
    "- Do not invent instance names/ids, tier names/ids, or period names/ids.",
    "- Keep JSON minimal (omit unused optional fields).",
    "",
    "Temporal context:",
    `- Today (UTC) is ${nowDateUTC}.`,
    `- Interpret the phrase "this year" as ${nowYear}.`,
    `- Interpret the phrase "last year" as ${lastYear}.`,
    "- If the prompt refers to \"current\" or \"previous\" instance, infer using instance start/end times relative to today.",
    "",
    "Additional filter types:",
    "- Upsell: { type: 'upsell', iteration, exists?, upsellItemId?, upsellItemName? }.",
    "- Email activity: { type: 'email', direction: 'outbound'|'inbound'|'either' (default 'outbound'), withinDays: number, exists? }.",
    "- Participant registration date range: within involvement.participant you may include createdAtGte and/or createdAtLte as ISO strings (e.g., '2025-06-01T00:00:00.000Z').",
    "- Volunteer registration date range: within involvement.volunteer you may include createdAtGte and/or createdAtLte as ISO strings (e.g., '2025-06-01T00:00:00.000Z').",
    "",
    "--- INSTRUCTIONS.md ---",
    instructions || "",
    "",
    "Prompt:",
    prompt,
    "",
    "Context (instances, tiers, periods, and year ambiguity):",
    JSON.stringify(context),
    "",
    "Return ONLY the JSON AST: { filter, pagination?, debug? }",
  ];
  return parts.join("\n");
};

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    if (!isOpenAIConfigured()) {
      return res.status(500).json({ message: "Server missing OPENAI_API_KEY" });
    }

    const { eventId } = req.params;
    const parsed = generativeInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: serializeError(parsed) });
    }
    const { prompt, includeContext = true, debug = false } = parsed.data;

    try {
      const instructions = getInstructions();
      const context = includeContext ? await buildContext(eventId) : {};
      const input = createInput({ instructions, prompt, context });

      const data = await createResponse(input);
      const content = extractText(data);
      const json = safeJsonParse(content);
      if (!json) {
        return res
          .status(502)
          .json({ message: "LLM returned non-JSON response" });
      }

      const validated = segmentSchema.safeParse(json);
      if (!validated.success) {
        return res
          .status(400)
          .json({ message: serializeError(validated), raw: json });
      }

      // Evaluate immediately and return both AST and results (no pagination)
      const currentInstanceId = req.instanceId || null;
      const { filter } = validated.data;
      const results = await evaluateSegment({
        eventId,
        currentInstanceId,
        filter,
        debug,
      });

      return res.json({ segment: validated.data, results });
    } catch (e) {
      console.error("[CRM SEGMENTS][GENERATIVE][POST] Error:", e);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
];

export const query = [
  verifyAuth(["manager"]),
  (req, res) => res.json(zerialize(generativeInputSchema)),
];
