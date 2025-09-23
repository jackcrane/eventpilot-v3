import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { verifyAuth } from "#verifyAuth";
import { LogType, MailingListMemberStatus } from "@prisma/client";
import cuid from "cuid";
import { z } from "zod";
import { zerialize } from "zodex";
import {
  ensureMailingList,
  ipAddress,
  memberInclude,
  memberSummarySelect,
} from "../memberUtils";

const batchSchema = z.object({
  crmPersonIds: z.array(z.string()).min(1),
  status: z
    .nativeEnum(MailingListMemberStatus)
    .optional()
    .default(MailingListMemberStatus.ACTIVE),
});

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, mailingListId } = req.params;
    const includeDeletedMembers = req.query.includeDeletedMembers === "true";

    try {
      const mailingList = await ensureMailingList(eventId, mailingListId);
      if (!mailingList) {
        return res.status(404).json({ message: "Mailing list not found" });
      }

      const members = await prisma.mailingListMember.findMany({
        where: {
          mailingListId,
          deleted: includeDeletedMembers ? undefined : false,
        },
        orderBy: { createdAt: "asc" },
        ...memberInclude,
      });

      return res.json({ members });
    } catch (error) {
      console.error(
        `Error fetching members for mailing list ${mailingListId}:`,
        error
      );
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, mailingListId } = req.params;
    const result = batchSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    const { crmPersonIds, status } = result.data;
    const uniqueIds = Array.from(new Set(crmPersonIds));

    try {
      const mailingList = await ensureMailingList(eventId, mailingListId);
      if (!mailingList) {
        return res.status(404).json({ message: "Mailing list not found" });
      }

      const [validPeople, existingMembers] = await Promise.all([
        prisma.crmPerson.findMany({
          where: {
            eventId,
            deleted: false,
            id: { in: uniqueIds },
          },
          select: { id: true },
        }),
        prisma.mailingListMember.findMany({
          where: {
            mailingListId,
            crmPersonId: { in: uniqueIds },
          },
          select: memberSummarySelect,
        }),
      ]);

      const validIds = new Set(validPeople.map((p) => p.id));
      const notFound = uniqueIds.filter((id) => !validIds.has(id));

      const existingByPersonId = new Map(
        existingMembers.map((member) => [member.crmPersonId, member])
      );

      const alreadyActive = [];
      const reactivated = [];
      const toCreate = [];

      for (const personId of uniqueIds) {
        if (!validIds.has(personId)) continue;

        const existing = existingByPersonId.get(personId);
        if (!existing) {
          toCreate.push(personId);
          continue;
        }

        if (existing.deleted) {
          reactivated.push(existing);
          continue;
        }

        alreadyActive.push(existing);
      }

      const now = new Date();
      const createRows = toCreate.map((personId) => ({
        id: cuid(),
        mailingListId,
        crmPersonId: personId,
        status,
        createdAt: now,
        updatedAt: now,
        deleted: false,
      }));

      const reactivateIds = reactivated.map((m) => m.id);

      const createdIds = createRows.map((row) => row.id);

      await prisma.$transaction(async (tx) => {
        if (createRows.length) {
          await tx.mailingListMember.createMany({ data: createRows });
        }

        if (reactivateIds.length) {
          await tx.mailingListMember.updateMany({
            where: { id: { in: reactivateIds } },
            data: { deleted: false, status, updatedAt: now },
          });
        }

        if (createdIds.length || reactivateIds.length) {
          const affectedMembers = await tx.mailingListMember.findMany({
            where: { id: { in: [...createdIds, ...reactivateIds] } },
            ...memberInclude,
          });

          const affectedById = new Map(
            affectedMembers.map((member) => [member.id, member])
          );

          const logEntries = [];

          for (const created of createdIds) {
            const member = affectedById.get(created);
            if (!member) continue;
            logEntries.push({
              type: LogType.MAILING_LIST_MEMBER_CREATED,
              userId: req.user.id,
              ip: ipAddress(req),
              eventId,
              mailingListId,
              mailingListMemberId: member.id,
              crmPersonId: member.crmPersonId,
              data: { before: null, after: member },
            });
          }

          for (const previous of reactivated) {
            const member = affectedById.get(previous.id);
            if (!member) continue;
            logEntries.push({
              type: LogType.MAILING_LIST_MEMBER_CREATED,
              userId: req.user.id,
              ip: ipAddress(req),
              eventId,
              mailingListId,
              mailingListMemberId: member.id,
              crmPersonId: member.crmPersonId,
              data: {
                before: { ...previous },
                after: member,
              },
            });
          }

          if (logEntries.length) {
            await tx.logs.createMany({ data: logEntries });
          }
        }
      });

      return res.status(201).json({
        created: createRows.length,
        reactivated: reactivated.length,
        skipped: {
          alreadyActive: alreadyActive.map((m) => m.crmPersonId),
          notFound,
        },
      });
    } catch (error) {
      console.error(
        `Error batch-adding members to mailing list ${mailingListId}:`,
        error
      );
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(batchSchema));
  },
];
