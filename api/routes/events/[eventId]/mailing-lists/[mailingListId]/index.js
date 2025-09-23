import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { verifyAuth } from "#verifyAuth";
import { LogType, MailingListMemberStatus } from "@prisma/client";
import { z } from "zod";
import { zerialize } from "zodex";

const mailingListSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

const includeMembers = (includeDeletedMembers) => ({
  members: {
    where: includeDeletedMembers ? undefined : { deleted: false },
    include: {
      crmPerson: {
        select: {
          id: true,
          name: true,
          deleted: true,
          emails: {
            where: { deleted: false },
            select: { id: true, email: true, label: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
  logs: {
    orderBy: { createdAt: "desc" },
    take: 50,
  },
});

const ipAddress = (req) => req.ip || req.headers["x-forwarded-for"];

const findMailingList = async (eventId, mailingListId, include) => {
  return prisma.mailingList.findFirst({
    where: {
      id: mailingListId,
      eventId,
    },
    include,
  });
};

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, mailingListId } = req.params;
    const includeDeletedList = !!req.query.includeDeleted;
    const includeDeletedMembers = req.query.includeDeletedMembers
      ? true
      : includeDeletedList;

    try {
      const mailingList = await prisma.mailingList.findFirst({
        where: {
          id: mailingListId,
          eventId,
          deleted: includeDeletedList ? undefined : false,
        },
        include: includeMembers(includeDeletedMembers),
      });

      if (!mailingList) {
        return res.status(404).json({ message: "Mailing list not found" });
      }

      return res.json({ mailingList });
    } catch (error) {
      console.error(
        `Error fetching mailing list ${mailingListId} for event ${eventId}:`,
        error
      );
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, mailingListId } = req.params;
    const result = mailingListSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    const { title } = result.data;

    try {
      const before = await findMailingList(eventId, mailingListId);
      if (!before || before.deleted) {
        return res.status(404).json({ message: "Mailing list not found" });
      }

      const mailingList = await prisma.$transaction(async (tx) => {
        const after = await tx.mailingList.update({
          where: { id: mailingListId },
          data: { title },
          include: includeMembers(false),
        });

        await tx.logs.create({
          data: {
            type: LogType.MAILING_LIST_MODIFIED,
            userId: req.user.id,
            ip: ipAddress(req),
            eventId,
            mailingListId,
            data: { before, after },
          },
        });

        return after;
      });

      return res.json({ mailingList });
    } catch (error) {
      console.error(
        `Error updating mailing list ${mailingListId} for event ${eventId}:`,
        error
      );

      if (error?.code === "P2002") {
        return res
          .status(409)
          .json({ message: "A mailing list with this title already exists." });
      }

      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, mailingListId } = req.params;

    try {
      const before = await prisma.mailingList.findFirst({
        where: {
          id: mailingListId,
          eventId,
          deleted: false,
        },
        include: includeMembers(true),
      });

      if (!before) {
        return res.status(404).json({ message: "Mailing list not found" });
      }

      await prisma.$transaction(async (tx) => {
        await tx.mailingList.update({
          where: { id: mailingListId },
          data: { deleted: true },
        });

        await tx.mailingListMember.updateMany({
          where: { mailingListId },
          data: { deleted: true, status: MailingListMemberStatus.DELETED },
        });

        await tx.logs.create({
          data: {
            type: LogType.MAILING_LIST_DELETED,
            userId: req.user.id,
            ip: ipAddress(req),
            eventId,
            mailingListId,
            data: { before },
          },
        });
      });

      return res.status(204).send();
    } catch (error) {
      console.error(
        `Error deleting mailing list ${mailingListId} for event ${eventId}:`,
        error
      );
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(mailingListSchema));
  },
];
