import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { verifyAuth } from "#verifyAuth";
import { LogType, MailingListMemberStatus } from "@prisma/client";
import { z } from "zod";
import { zerialize } from "zodex";
import { reportApiError } from "#util/reportApiError.js";
import {
  ensureCrmPerson,
  ensureMailingList,
  findMember,
  ipAddress,
  memberInclude,
} from "../memberUtils";
import { createLogBuffer } from "../../../../../util/logging.js";

const memberCreateSchema = z.object({
  crmPersonId: z.string(),
  status: z
    .nativeEnum(MailingListMemberStatus)
    .optional()
    .default(MailingListMemberStatus.ACTIVE),
});

const memberUpdateSchema = z.object({
  crmPersonId: z.string(),
  status: z.nativeEnum(MailingListMemberStatus),
});

const memberDeleteSchema = z.object({
  crmPersonId: z.string(),
});

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, mailingListId } = req.params;
    const result = memberCreateSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    const { crmPersonId } = result.data;
    const status = result.data.status ?? MailingListMemberStatus.ACTIVE;

    try {
      const mailingList = await ensureMailingList(eventId, mailingListId);
      if (!mailingList) {
        return res.status(404).json({ message: "Mailing list not found" });
      }

      const crmPerson = await ensureCrmPerson(eventId, crmPersonId);
      if (!crmPerson) {
        return res.status(404).json({ message: "CRM person not found" });
      }

      const existing = await findMember(mailingListId, crmPersonId);

      if (existing && !existing.deleted && existing.status === status) {
        return res.json({ member: existing });
      }

      const logBuffer = createLogBuffer();

      const member = await prisma.$transaction(async (tx) => {
        let logType = LogType.MAILING_LIST_MEMBER_CREATED;
        let before = existing ?? null;
        let after;

        if (existing) {
          after = await tx.mailingListMember.update({
            where: { id: existing.id },
            data: {
              deleted: false,
              status,
            },
            ...memberInclude,
          });

          logType = existing.deleted
            ? LogType.MAILING_LIST_MEMBER_CREATED
            : LogType.MAILING_LIST_MEMBER_MODIFIED;
        } else {
          after = await tx.mailingListMember.create({
            data: {
              mailingListId,
              crmPersonId,
              status,
            },
            ...memberInclude,
          });
        }

        logBuffer.push({
          type: logType,
          userId: req.user.id,
          ip: ipAddress(req),
          eventId,
          mailingListId,
          mailingListMemberId: after.id,
          crmPersonId,
          data: { before, after },
        });

        return after;
      });

      await logBuffer.flush();

      const statusCode = existing ? 200 : 201;
      return res.status(statusCode).json({ member });
    } catch (error) {
      console.error(
        `Error creating mailing list member for mailing list ${mailingListId}:`,
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
    const result = memberUpdateSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    const { crmPersonId, status } = result.data;

    try {
      const mailingList = await ensureMailingList(eventId, mailingListId);
      if (!mailingList) {
        return res.status(404).json({ message: "Mailing list not found" });
      }

      const existing = await findMember(mailingListId, crmPersonId);

      if (!existing || existing.deleted) {
        return res.status(404).json({ message: "Mailing list member not found" });
      }

      if (existing.status === status) {
        return res.json({ member: existing });
      }

      const logBuffer = createLogBuffer();

      const member = await prisma.$transaction(async (tx) => {
        const after = await tx.mailingListMember.update({
          where: { id: existing.id },
          data: { status },
          ...memberInclude,
        });

        logBuffer.push({
          type: LogType.MAILING_LIST_MEMBER_MODIFIED,
          userId: req.user.id,
          ip: ipAddress(req),
          eventId,
          mailingListId,
          mailingListMemberId: existing.id,
          crmPersonId,
          data: { before: existing, after },
        });

        return after;
      });

      await logBuffer.flush();

      return res.json({ member });
    } catch (error) {
      console.error(
        `Error updating mailing list member for mailing list ${mailingListId}:`,
        error
      );
      reportApiError(error, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, mailingListId } = req.params;
    const result = memberDeleteSchema.safeParse(req.body ?? {});

    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    const { crmPersonId } = result.data;

    try {
      const mailingList = await ensureMailingList(eventId, mailingListId);
      if (!mailingList) {
        return res.status(404).json({ message: "Mailing list not found" });
      }

      const existing = await findMember(mailingListId, crmPersonId);

      if (!existing || existing.deleted) {
        return res.status(404).json({ message: "Mailing list member not found" });
      }

      const logBuffer = createLogBuffer();

      await prisma.$transaction(async (tx) => {
        await tx.mailingListMember.update({
          where: { id: existing.id },
          data: { deleted: true, status: MailingListMemberStatus.DELETED },
        });

        logBuffer.push({
          type: LogType.MAILING_LIST_MEMBER_DELETED,
          userId: req.user.id,
          ip: ipAddress(req),
          eventId,
          mailingListId,
          mailingListMemberId: existing.id,
          crmPersonId,
          data: { before: existing },
        });
      });

      await logBuffer.flush();

      return res.status(204).send();
    } catch (error) {
      console.error(
        `Error removing mailing list member for mailing list ${mailingListId}:`,
        error
      );
      reportApiError(error, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(
      zerialize(
        z.object({
          create: memberCreateSchema,
          update: memberUpdateSchema,
          delete: memberDeleteSchema,
        })
      )
    );
  },
];
