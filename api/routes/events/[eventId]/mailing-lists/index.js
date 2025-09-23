import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { verifyAuth } from "#verifyAuth";
import { LogType } from "@prisma/client";
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
});

const ipAddress = (req) => req.ip || req.headers["x-forwarded-for"];

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const includeDeleted = !!req.query.includeDeleted;
    const includeDeletedMembers = req.query.includeDeletedMembers
      ? true
      : includeDeleted;

    try {
      const mailingLists = await prisma.mailingList.findMany({
        where: {
          eventId,
          deleted: includeDeleted ? undefined : false,
        },
        include: includeMembers(includeDeletedMembers),
        orderBy: { createdAt: "desc" },
      });

      return res.json({ mailingLists });
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
          include: includeMembers(false),
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

      return res.status(201).json({ mailingList });
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
