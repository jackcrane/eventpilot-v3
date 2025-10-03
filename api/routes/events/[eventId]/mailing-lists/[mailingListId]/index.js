import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { verifyAuth } from "#verifyAuth";
import { LogType, MailingListMemberStatus } from "@prisma/client";
import { z } from "zod";
import { zerialize } from "zodex";
import { createLogBuffer } from "../../../../../util/logging.js";

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

const logsSelection = {
  orderBy: { createdAt: "desc" },
  take: 50,
};

const mailingListSelection = {
  ...baseMailingListSelect,
  crmSavedSegment: {
    select: {
      id: true,
      title: true,
      prompt: true,
      ast: true,
    },
  },
  logs: logsSelection,
};

const formatMailingList = (mailingList, memberCount = 0) => ({
  ...mailingList,
  crmSavedSegmentId: mailingList.crmSavedSegmentId ?? null,
  crmSavedSegment: mailingList.crmSavedSegment || null,
  memberCount,
});

const ipAddress = (req) => req.ip || req.headers["x-forwarded-for"];

const findMailingList = async (eventId, mailingListId, options = {}) => {
  return prisma.mailingList.findFirst({
    where: {
      id: mailingListId,
      eventId,
    },
    ...options,
  });
};

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, mailingListId } = req.params;
    const includeDeletedList = !!req.query.includeDeleted;
    try {
      const mailingList = await prisma.mailingList.findFirst({
        where: {
          id: mailingListId,
          eventId,
          deleted: includeDeletedList ? undefined : false,
        },
        select: mailingListSelection,
      });

      if (!mailingList) {
        return res.status(404).json({ message: "Mailing list not found" });
      }

      const memberCount = await prisma.mailingListMember.count({
        where: {
          mailingListId,
          deleted: false,
          status: MailingListMemberStatus.ACTIVE,
        },
      });

      return res.json({
        mailingList: formatMailingList(mailingList, memberCount),
      });
    } catch (error) {
      console.error(
        `Error fetching mailing list ${mailingListId} for event ${eventId}:`,
        error
      );
      reportApiError(error, req);
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
    const hasSegmentField = Object.prototype.hasOwnProperty.call(
      result.data,
      "crmSavedSegmentId"
    );
    const crmSavedSegmentId = hasSegmentField
      ? result.data.crmSavedSegmentId
      : undefined;

    try {
      const before = await findMailingList(eventId, mailingListId, {
        select: mailingListSelection,
      });
      const beforeCount = before
        ? await prisma.mailingListMember.count({
            where: {
              mailingListId,
              deleted: false,
              status: MailingListMemberStatus.ACTIVE,
            },
          })
        : 0;
      if (!before || before.deleted) {
        return res.status(404).json({ message: "Mailing list not found" });
      }

      if (hasSegmentField && crmSavedSegmentId) {
        const segment = await prisma.crmSavedSegment.findFirst({
          where: {
            id: crmSavedSegmentId,
            eventId,
            deleted: false,
          },
        });
        if (!segment) {
          return res.status(400).json({
            message: "Saved segment not found for this event.",
          });
        }
      }

      const updateData = {};
      if (typeof title === "string") {
        updateData.title = title;
      }
      if (hasSegmentField) {
        updateData.crmSavedSegmentId = crmSavedSegmentId ?? null;
      }

      const logBuffer = createLogBuffer();

      const mailingList = await prisma.$transaction(async (tx) => {
        const after = await tx.mailingList.update({
          where: { id: mailingListId },
          data: updateData,
          select: mailingListSelection,
        });

        const afterCount = await tx.mailingListMember.count({
          where: {
            mailingListId,
            deleted: false,
            status: MailingListMemberStatus.ACTIVE,
          },
        });

        logBuffer.push({
          type: LogType.MAILING_LIST_MODIFIED,
          userId: req.user.id,
          ip: ipAddress(req),
          eventId,
          mailingListId,
          data: {
            before: formatMailingList(before, beforeCount),
            after: formatMailingList(after, afterCount),
          },
          crmSavedSegmentId: hasSegmentField
            ? (crmSavedSegmentId ?? null)
            : (before.crmSavedSegmentId ?? null),
        });

        return formatMailingList(after, afterCount);
      });

      await logBuffer.flush();

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

      reportApiError(error, req);
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
        select: mailingListSelection,
      });

      if (!before) {
        return res.status(404).json({ message: "Mailing list not found" });
      }

      const beforeCount = await prisma.mailingListMember.count({
        where: {
          mailingListId,
          deleted: false,
          status: MailingListMemberStatus.ACTIVE,
        },
      });

      const logBuffer = createLogBuffer();

      await prisma.$transaction(async (tx) => {
        await tx.mailingList.update({
          where: { id: mailingListId },
          data: { deleted: true },
        });

        await tx.mailingListMember.updateMany({
          where: { mailingListId },
          data: { deleted: true, status: MailingListMemberStatus.DELETED },
        });

        logBuffer.push({
          type: LogType.MAILING_LIST_DELETED,
          userId: req.user.id,
          ip: ipAddress(req),
          eventId,
          mailingListId,
          data: { before: formatMailingList(before, beforeCount) },
        });
      });

      await logBuffer.flush();

      return res.status(204).send();
    } catch (error) {
      console.error(
        `Error deleting mailing list ${mailingListId} for event ${eventId}:`,
        error
      );
      reportApiError(error, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(mailingListSchema));
  },
];
