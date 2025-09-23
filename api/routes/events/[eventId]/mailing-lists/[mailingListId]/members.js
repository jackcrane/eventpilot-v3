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
    const rawPage = Number.parseInt(req.query.page, 10);
    const rawSize = Number.parseInt(req.query.size, 10);
    const size = Number.isFinite(rawSize)
      ? Math.min(Math.max(rawSize, 1), 100)
      : 25;

    try {
      const mailingList = await ensureMailingList(eventId, mailingListId);
      if (!mailingList) {
        return res.status(404).json({ message: "Mailing list not found" });
      }

      const baseWhere = {
        mailingListId,
        deleted: includeDeletedMembers ? undefined : false,
      };

      const total = await prisma.mailingListMember.count({ where: baseWhere });

      const totalPages = Math.max(1, Math.ceil(total / Math.max(size, 1)));
      const page = Number.isFinite(rawPage)
        ? Math.min(Math.max(rawPage, 1), totalPages)
        : 1;
      const skip = (page - 1) * size;

      const members = await prisma.mailingListMember.findMany({
        where: baseWhere,
        orderBy: { createdAt: "asc" },
        skip,
        take: size,
        ...memberInclude,
      });

      return res.json({
        members,
        page,
        size,
        total,
        totalPages,
      });
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
      const alreadyDeleted = [];
      const reactivated = [];
      const toCreate = [];
      const toUpdate = [];

      for (const personId of uniqueIds) {
        if (!validIds.has(personId)) continue;

        const existing = existingByPersonId.get(personId);
        if (!existing) {
          if (status === MailingListMemberStatus.DELETED) {
            continue;
          }
          toCreate.push(personId);
          continue;
        }

        if (existing.deleted) {
          if (status === MailingListMemberStatus.DELETED) {
            alreadyDeleted.push(existing);
            continue;
          }

          reactivated.push(existing);
          continue;
        }

        if (existing.status === status) {
          if (status === MailingListMemberStatus.DELETED) {
            alreadyDeleted.push(existing);
          } else {
            alreadyActive.push(existing);
          }
          continue;
        }

        toUpdate.push(existing);
      }

      const now = new Date();
      const createRows = toCreate.map((personId) => ({
        id: cuid(),
        mailingListId,
        crmPersonId: personId,
        status,
        createdAt: now,
        updatedAt: now,
        deleted: status === MailingListMemberStatus.DELETED,
      }));

      const reactivateIds = reactivated.map((m) => m.id);
      const updateIds = toUpdate.map((m) => m.id);

      const createdIds = createRows.map((row) => row.id);

      let createdMembers = [];
      let createdResultCount = 0;

      await prisma.$transaction(async (tx) => {
        if (createRows.length) {
          const result = await tx.mailingListMember.createMany({
            data: createRows,
            skipDuplicates: true,
          });
          createdResultCount = result?.count ?? 0;
        }

        if (reactivateIds.length) {
          await tx.mailingListMember.updateMany({
            where: { id: { in: reactivateIds } },
            data: { deleted: false, status, updatedAt: now },
          });
        }

        if (updateIds.length) {
          await tx.mailingListMember.updateMany({
            where: { id: { in: updateIds } },
            data: {
              status,
              deleted: status === MailingListMemberStatus.DELETED,
              updatedAt: now,
            },
          });
        }

        if (createdIds.length || reactivateIds.length || updateIds.length) {
          const affectedMembers = await tx.mailingListMember.findMany({
            where: {
              OR: [
                { id: { in: [...createdIds, ...reactivateIds] } },
                ...(updateIds.length ? [{ id: { in: updateIds } }] : []),
                ...createRows.map((row) => ({
                  mailingListId: row.mailingListId,
                  crmPersonId: row.crmPersonId,
                })),
              ],
            },
            ...memberInclude,
          });

          const affectedById = new Map(
            affectedMembers.map((member) => [member.id, member])
          );

          const affectedByPair = new Map(
            affectedMembers.map((member) => [
              `${member.mailingListId}:${member.crmPersonId}`,
              member,
            ])
          );

          createdMembers = createRows
            .map((row) =>
              affectedByPair.get(`${row.mailingListId}:${row.crmPersonId}`)
            )
            .filter(Boolean);

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

          for (const previous of toUpdate) {
            const member = affectedById.get(previous.id);
            if (!member) continue;

            const isDeletion =
              status === MailingListMemberStatus.DELETED;

            logEntries.push({
              type: isDeletion
                ? LogType.MAILING_LIST_MEMBER_DELETED
                : LogType.MAILING_LIST_MEMBER_MODIFIED,
              userId: req.user.id,
              ip: ipAddress(req),
              eventId,
              mailingListId,
              mailingListMemberId: previous.id,
              crmPersonId: previous.crmPersonId,
              data: isDeletion
                ? { before: previous }
                : { before: previous, after: member },
            });
          }

          if (logEntries.length) {
            await tx.logs.createMany({ data: logEntries });
          }
        }
      });

      const createdMemberIds = new Set(createdMembers.map((member) => member.id));
      const duplicateRows = createRows.filter(
        (row) => !createdMemberIds.has(row.id)
      );

      if (duplicateRows.length) {
        const duplicateIds = duplicateRows.map((row) => row.crmPersonId);
        const existingForDuplicates = await prisma.mailingListMember.findMany({
          where: {
            mailingListId,
            crmPersonId: { in: duplicateIds },
          },
          select: memberSummarySelect,
        });

        for (const existing of existingForDuplicates) {
          if (!alreadyActive.some((m) => m.crmPersonId === existing.crmPersonId)) {
            alreadyActive.push(existing);
          }
        }
      }

      return res.status(201).json({
        created: createdResultCount,
        reactivated: reactivated.length,
        updated: toUpdate.length,
        skipped: {
          alreadyActive: alreadyActive.map((m) => m.crmPersonId),
          alreadyDeleted: alreadyDeleted.map((m) => m.crmPersonId),
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
