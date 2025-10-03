import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { verifyAuth } from "#verifyAuth";
import { LogType, MailingListMemberStatus } from "@prisma/client";
import cuid from "cuid";
import { z } from "zod";
import { zerialize } from "zodex";
import { evaluateSegment } from "../crm/segments/index.js";
import { memberInclude } from "./memberUtils.js";
import { createLogBuffer } from "../../../../util/logging.js";

const mailingListSchema = z.object({
  title: z.string().trim().min(1).max(120),
  crmSavedSegmentId: z.string().cuid().nullable().optional(),
});

const baseMailingListSelect = {
  id: true,
  title: true,
  eventId: true,
  createdAt: true,
  updatedAt: true,
  deleted: true,
  crmSavedSegmentId: true,
};

const savedSegmentSelect = {
  id: true,
  title: true,
  prompt: true,
  ast: true,
};

const parseCrmPersonIds = (value) => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((entry) => (typeof entry === "string" ? entry.split(",") : []))
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const resolveMembershipState = (activeCount, totalSelected) => {
  if (!totalSelected) return null;
  if (activeCount === 0) return "NONE";
  if (activeCount === totalSelected) return "ALL";
  return "PARTIAL";
};

const formatMailingList = (
  mailingList,
  memberCount = 0,
  membershipState = null,
  selectedMatchCount = 0
) => ({
  ...mailingList,
  crmSavedSegmentId: mailingList.crmSavedSegmentId ?? null,
  crmSavedSegment: mailingList.crmSavedSegment || null,
  memberCount,
  membershipState,
  selectedMatchCount,
});

const ipAddress = (req) => req.ip || req.headers["x-forwarded-for"];

const seedMailingListFromSegment = async ({
  eventId,
  mailingList,
  crmSavedSegmentId,
  req,
}) => {
  if (!crmSavedSegmentId) return { created: 0, totalMatches: 0 };
  const ast = mailingList?.crmSavedSegment?.ast;
  const filter = ast?.filter;
  if (!filter) return { created: 0, totalMatches: 0 };

  try {
    const evaluation = await evaluateSegment({
      eventId,
      currentInstanceId: req.instanceId || null,
      filter,
      debug: false,
      pagination: {},
    });

    const people = Array.isArray(evaluation?.crmPersons)
      ? evaluation.crmPersons
      : [];

    if (!people.length) {
      await prisma.crmSavedSegment.update({
        where: { id: crmSavedSegmentId },
        data: { lastUsed: new Date() },
      });
      return { created: 0, totalMatches: 0 };
    }

    const uniqueIds = Array.from(
      new Set(
        people
          .map((person) => person?.id)
          .filter((id) => typeof id === "string" && id.length)
      )
    );

    if (!uniqueIds.length) {
      await prisma.crmSavedSegment.update({
        where: { id: crmSavedSegmentId },
        data: { lastUsed: new Date() },
      });
      return { created: 0, totalMatches: 0 };
    }

    let createdCount = 0;
    const logBuffer = createLogBuffer();

    await prisma.$transaction(async (tx) => {
      const existingMembers = await tx.mailingListMember.findMany({
        where: {
          mailingListId: mailingList.id,
          crmPersonId: { in: uniqueIds },
        },
        select: { crmPersonId: true },
      });

      const existingIds = new Set(
        existingMembers.map((member) => member.crmPersonId)
      );

      const idsToCreate = uniqueIds.filter((id) => !existingIds.has(id));

      if (idsToCreate.length) {
        const now = new Date();
        const createRows = idsToCreate.map((crmPersonId) => ({
          id: cuid(),
          mailingListId: mailingList.id,
          crmPersonId,
          status: MailingListMemberStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
          deleted: false,
        }));

        await tx.mailingListMember.createMany({
          data: createRows,
          skipDuplicates: true,
        });

        const createdMembers = await tx.mailingListMember.findMany({
          where: { id: { in: createRows.map((row) => row.id) } },
          ...memberInclude,
        });

        createdCount = createdMembers.length;

        if (createdMembers.length) {
          logBuffer.pushMany(
            createdMembers.map((member) => ({
              type: LogType.MAILING_LIST_MEMBER_CREATED,
              userId: req.user?.id ?? null,
              ip: ipAddress(req),
              eventId,
              mailingListId: mailingList.id,
              mailingListMemberId: member.id,
              crmPersonId: member.crmPersonId,
              crmSavedSegmentId,
              data: { before: null, after: member },
            }))
          );
        }
      }

      if (crmSavedSegmentId) {
        await tx.crmSavedSegment.update({
          where: { id: crmSavedSegmentId },
          data: { lastUsed: new Date() },
        });
      }
    });

    await logBuffer.flush();

    return { created: createdCount, totalMatches: uniqueIds.length };
  } catch (error) {
    console.error(
      `Error seeding mailing list ${mailingList?.id} from AI segment:`,
      error
    );
    return { created: 0, totalMatches: 0 };
  }
};

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const includeDeleted = !!req.query.includeDeleted;
    const crmPersonIds = parseCrmPersonIds(req.query.crmPersonIds);
    const uniquePersonIds = Array.from(new Set(crmPersonIds));

    try {
      const mailingLists = await prisma.mailingList.findMany({
        where: {
          eventId,
          deleted: includeDeleted ? undefined : false,
        },
        select: {
          ...baseMailingListSelect,
          crmSavedSegment: { select: savedSegmentSelect },
        },
        orderBy: { createdAt: "desc" },
      });

      const mailingListIds = mailingLists.map((list) => list.id);
      const memberCounts = mailingListIds.length
        ? await prisma.mailingListMember.groupBy({
            by: ["mailingListId"],
            where: {
              mailingListId: { in: mailingListIds },
              deleted: false,
              status: MailingListMemberStatus.ACTIVE,
            },
            _count: { _all: true },
          })
        : [];

      const countsById = memberCounts.reduce(
        (acc, { mailingListId, _count }) => {
          acc[mailingListId] = _count?._all ?? 0;
          return acc;
        },
        {}
      );

      let membershipCountsByListId = {};

      if (mailingListIds.length && uniquePersonIds.length) {
        const membershipCounts = await prisma.mailingListMember.groupBy({
          by: ["mailingListId"],
          where: {
            mailingListId: { in: mailingListIds },
            crmPersonId: { in: uniquePersonIds },
            deleted: false,
            status: MailingListMemberStatus.ACTIVE,
          },
          _count: { _all: true },
        });

        membershipCountsByListId = membershipCounts.reduce(
          (acc, { mailingListId, _count }) => {
            acc[mailingListId] = _count?._all ?? 0;
            return acc;
          },
          {}
        );
      }

      const selectedCount = uniquePersonIds.length;

      const response = mailingLists.map((list) => {
        const memberCount = countsById[list.id] ?? 0;
        const selectedMatchCount = membershipCountsByListId[list.id] ?? 0;
        const membershipState = resolveMembershipState(
          selectedMatchCount,
          selectedCount
        );

        return formatMailingList(
          list,
          memberCount,
          membershipState,
          selectedMatchCount
        );
      });

      return res.json({ mailingLists: response });
    } catch (error) {
      console.error(
        `Error fetching mailing lists for event ${eventId}:`,
        error
      );
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;

    const result = mailingListSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    const { title } = result.data;
    const hasSegmentField = Object.prototype.hasOwnProperty.call(
      result.data,
      "crmSavedSegmentId"
    );
    const crmSavedSegmentId = hasSegmentField
      ? result.data.crmSavedSegmentId
      : undefined;

    if (hasSegmentField && crmSavedSegmentId) {
      const segment = await prisma.crmSavedSegment.findFirst({
        where: {
          id: crmSavedSegmentId,
          eventId,
          deleted: false,
        },
      });
      if (!segment) {
        return res
          .status(400)
          .json({ message: "Saved segment not found for this event." });
      }
    }

    const existingByTitle = await prisma.mailingList.findFirst({
      where: {
        eventId,
        title,
      },
      select: {
        id: true,
        deleted: true,
      },
    });

    if (existingByTitle && !existingByTitle.deleted) {
      return res
        .status(409)
        .json({ message: "A mailing list with this title already exists." });
    }

    try {
      const logBuffer = createLogBuffer();
      const mailingList = await prisma.$transaction(async (tx) => {
        if (existingByTitle?.deleted) {
          await tx.mailingListMember.deleteMany({
            where: { mailingListId: existingByTitle.id },
          });

          const restored = await tx.mailingList.update({
            where: { id: existingByTitle.id },
            data: {
              title,
              deleted: false,
              ...(hasSegmentField
                ? { crmSavedSegmentId: crmSavedSegmentId ?? null }
                : {}),
            },
            select: {
              ...baseMailingListSelect,
              crmSavedSegment: { select: savedSegmentSelect },
            },
          });

          logBuffer.push({
            type: LogType.MAILING_LIST_CREATED,
            userId: req.user.id,
            ip: ipAddress(req),
            eventId,
            mailingListId: restored.id,
            data: { after: restored },
            crmSavedSegmentId: hasSegmentField
              ? (crmSavedSegmentId ?? null)
              : (restored.crmSavedSegmentId ?? null),
          });

          return restored;
        }

        const created = await tx.mailingList.create({
          data: {
            title,
            eventId,
            ...(hasSegmentField
              ? { crmSavedSegmentId: crmSavedSegmentId ?? null }
              : {}),
          },
          select: {
            ...baseMailingListSelect,
            crmSavedSegment: { select: savedSegmentSelect },
          },
        });

        logBuffer.push({
          type: LogType.MAILING_LIST_CREATED,
          userId: req.user.id,
          ip: ipAddress(req),
          eventId,
          mailingListId: created.id,
          data: { after: created },
          crmSavedSegmentId: hasSegmentField
            ? (crmSavedSegmentId ?? null)
            : (created.crmSavedSegmentId ?? null),
        });

        return created;
      });

      await logBuffer.flush();

      let seeded = { created: 0, totalMatches: 0 };
      if (hasSegmentField && crmSavedSegmentId) {
        seeded = await seedMailingListFromSegment({
          eventId,
          mailingList,
          crmSavedSegmentId,
          req,
        });
      }

      return res.status(201).json({
        mailingList: formatMailingList(mailingList, seeded.created),
      });
    } catch (error) {
      console.error(`Error creating mailing list for event ${eventId}:`, error);

      if (error?.code === "P2002") {
        return res
          .status(409)
          .json({ message: "A mailing list with this title already exists." });
      }

      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(mailingListSchema));
  },
];
