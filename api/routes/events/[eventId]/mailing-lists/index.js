import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { verifyAuth } from "#verifyAuth";
import { LogType, MailingListMemberStatus } from "@prisma/client";
import { z } from "zod";
import { zerialize } from "zodex";

const mailingListSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

const baseMailingListSelect = {
  id: true,
  title: true,
  eventId: true,
  createdAt: true,
  updatedAt: true,
  deleted: true,
};

const parseCrmPersonIds = (value) => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((entry) =>
      typeof entry === "string" ? entry.split(",") : []
    )
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
  memberCount,
  membershipState,
  selectedMatchCount,
});

const ipAddress = (req) => req.ip || req.headers["x-forwarded-for"];

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
        select: baseMailingListSelect,
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

      const countsById = memberCounts.reduce((acc, { mailingListId, _count }) => {
        acc[mailingListId] = _count?._all ?? 0;
        return acc;
      }, {});

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

    try {
      const mailingList = await prisma.$transaction(async (tx) => {
        const created = await tx.mailingList.create({
          data: {
            title,
            eventId,
          },
          select: baseMailingListSelect,
        });

        await tx.logs.create({
          data: {
            type: LogType.MAILING_LIST_CREATED,
            userId: req.user.id,
            ip: ipAddress(req),
            eventId,
            mailingListId: created.id,
            data: { after: created },
          },
        });

        return created;
      });

      return res.status(201).json({ mailingList: formatMailingList(mailingList) });
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
