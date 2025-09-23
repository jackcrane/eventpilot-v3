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

const formatMailingList = (mailingList, memberCount = 0) => ({
  ...mailingList,
  memberCount,
});

const ipAddress = (req) => req.ip || req.headers["x-forwarded-for"];

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const includeDeleted = !!req.query.includeDeleted;
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

      const response = mailingLists.map((list) =>
        formatMailingList(list, countsById[list.id] ?? 0)
      );

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
