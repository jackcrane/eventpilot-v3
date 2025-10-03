import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { verifyAuth } from "#verifyAuth";
import { LogType, MailingListMemberStatus } from "@prisma/client";
import cuid from "cuid";
import { z } from "zod";
import { zerialize } from "zodex";
import { reportApiError } from "#util/reportApiError.js";
import {
  ensureMailingList,
  ipAddress,
  memberInclude,
  memberSummarySelect,
} from "../memberUtils";
import { createLogBuffer } from "../../../../../util/logging.js";

const toStringValue = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return null;
};

const parseDateValue = (value) => {
  const str = toStringValue(value);
  if (!str) return null;
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const parseFilters = (input) => {
  if (!input) return [];
  let raw = input;
  if (Array.isArray(raw)) {
    raw = raw[raw.length - 1];
  }
  if (typeof raw !== "string" || !raw.length) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        const label = toStringValue(entry?.label);
        const operation = toStringValue(entry?.operation);
        if (!label || !operation) return null;
        return {
          label,
          operation,
          value: entry?.value ?? null,
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.warn(error);
    return [];
  }
};

const buildNameCondition = (operation, value) => {
  const text = toStringValue(value);
  const scoped = (condition) => ({ crmPerson: { name: condition } });
  switch (operation) {
    case "eq":
      if (!text) return null;
      return scoped({ equals: text, mode: "insensitive" });
    case "neq":
      if (!text) return null;
      return { NOT: scoped({ equals: text, mode: "insensitive" }) };
    case "contains":
      if (!text) return null;
      return scoped({ contains: text, mode: "insensitive" });
    case "not-contains":
      if (!text) return null;
      return { NOT: scoped({ contains: text, mode: "insensitive" }) };
    case "starts-with":
      if (!text) return null;
      return scoped({ startsWith: text, mode: "insensitive" });
    case "ends-with":
      if (!text) return null;
      return scoped({ endsWith: text, mode: "insensitive" });
    case "exists":
      return scoped({ not: null });
    case "not-exists":
      return {
        OR: [{ crmPerson: { name: null } }, { crmPerson: { name: "" } }],
      };
    default:
      return null;
  }
};

const buildEmailCondition = (operation, value) => {
  const text = toStringValue(value);
  const scoped = (condition) => ({
    crmPerson: {
      emails: {
        some: {
          email: condition,
        },
      },
    },
  });

  switch (operation) {
    case "eq":
      if (!text) return null;
      return scoped({ equals: text, mode: "insensitive" });
    case "neq":
      if (!text) return null;
      return { NOT: scoped({ equals: text, mode: "insensitive" }) };
    case "contains":
      if (!text) return null;
      return scoped({ contains: text, mode: "insensitive" });
    case "not-contains":
      if (!text) return null;
      return { NOT: scoped({ contains: text, mode: "insensitive" }) };
    case "starts-with":
      if (!text) return null;
      return scoped({ startsWith: text, mode: "insensitive" });
    case "ends-with":
      if (!text) return null;
      return scoped({ endsWith: text, mode: "insensitive" });
    case "exists":
      return {
        crmPerson: {
          emails: {
            some: {
              email: {
                not: null,
              },
            },
          },
        },
      };
    case "not-exists":
      return {
        NOT: {
          crmPerson: {
            emails: {
              some: {
                email: {
                  not: null,
                },
              },
            },
          },
        },
      };
    default:
      return null;
  }
};

const buildStatusCondition = (operation, value) => {
  const text = toStringValue(value);
  const normalized = text ? text.toUpperCase() : text;
  const validStatuses = Object.values(MailingListMemberStatus);
  const isValid = normalized && validStatuses.includes(normalized);
  switch (operation) {
    case "eq":
      if (!isValid) return null;
      return {
        condition: { status: normalized },
        requiresDeleted: normalized === MailingListMemberStatus.DELETED,
      };
    case "neq":
      if (!isValid) return null;
      return {
        condition: { NOT: { status: normalized } },
        requiresDeleted: normalized !== MailingListMemberStatus.DELETED,
      };
    case "exists":
      return {
        condition: { status: { not: null } },
        requiresDeleted: true,
      };
    case "not-exists":
      return {
        condition: { status: null },
        requiresDeleted: true,
      };
    default:
      return { condition: null, requiresDeleted: false };
  }
};

const buildCreatedAtCondition = (operation, value) => {
  const date = parseDateValue(value);
  switch (operation) {
    case "eq":
      if (!date) return null;
      return { createdAt: date };
    case "neq":
      if (!date) return null;
      return { NOT: { createdAt: date } };
    case "date-after":
      if (!date) return null;
      return { createdAt: { gte: date } };
    case "date-before":
      if (!date) return null;
      return { createdAt: { lte: date } };
    case "exists":
      return { createdAt: { not: null } };
    case "not-exists":
      return { createdAt: null };
    default:
      return null;
  }
};

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
    let includeDeletedMembers = req.query.includeDeletedMembers === "true";
    const rawPage = Number.parseInt(req.query.page, 10);
    const rawSize = Number.parseInt(req.query.size, 10);
    const searchTerm = toStringValue(req.query.q);
    const parsedFilters = parseFilters(req.query.filters);
    const size = Number.isFinite(rawSize)
      ? Math.min(Math.max(rawSize, 1), 100)
      : 25;

    try {
      const mailingList = await ensureMailingList(eventId, mailingListId);
      if (!mailingList) {
        return res.status(404).json({ message: "Mailing list not found" });
      }

      const filterConditions = [];
      let requiresDeleted = false;

      for (const filter of parsedFilters) {
        if (!filter) continue;
        const { label, operation, value } = filter;
        if (!label || !operation) continue;
        let condition = null;

        switch (label) {
          case "name":
            condition = buildNameCondition(operation, value);
            break;
          case "email":
            condition = buildEmailCondition(operation, value);
            break;
          case "status": {
            const result = buildStatusCondition(operation, value);
            condition = result?.condition ?? null;
            if (result?.requiresDeleted) {
              requiresDeleted = true;
            }
            break;
          }
          case "createdAt":
            condition = buildCreatedAtCondition(operation, value);
            break;
          default:
            break;
        }

        if (condition) {
          filterConditions.push(condition);
        }
      }

      if (requiresDeleted) {
        includeDeletedMembers = true;
      }

      const baseWhere = {
        mailingListId,
        deleted: includeDeletedMembers ? undefined : false,
      };

      const andConditions = [...filterConditions];

      if (searchTerm) {
        andConditions.push({
          OR: [
            {
              crmPerson: {
                name: {
                  contains: searchTerm,
                  mode: "insensitive",
                },
              },
            },
            {
              crmPerson: {
                emails: {
                  some: {
                    email: {
                      contains: searchTerm,
                      mode: "insensitive",
                    },
                  },
                },
              },
            },
          ],
        });
      }

      const where = andConditions.length
        ? {
            ...baseWhere,
            AND: andConditions,
          }
        : baseWhere;

      const total = await prisma.mailingListMember.count({ where });

      const totalPages = Math.max(1, Math.ceil(total / Math.max(size, 1)));
      const page = Number.isFinite(rawPage)
        ? Math.min(Math.max(rawPage, 1), totalPages)
        : 1;
      const skip = (page - 1) * size;

      const members = await prisma.mailingListMember.findMany({
        where,
        orderBy: [
          { crmPerson: { name: "asc" } },
          { crmPerson: { id: "asc" } },
          { createdAt: "asc" },
        ],
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
      reportApiError(error, req);
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
    const isRemovalRequest = status === MailingListMemberStatus.DELETED;
    const targetStatus = isRemovalRequest
      ? MailingListMemberStatus.DELETED
      : MailingListMemberStatus.ACTIVE;
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
      const unsubscribed = new Set();

      for (const personId of uniqueIds) {
        if (!validIds.has(personId)) continue;

        const existing = existingByPersonId.get(personId);
        if (!existing) {
          if (isRemovalRequest) {
            continue;
          }
          toCreate.push(personId);
          continue;
        }

        if (
          !isRemovalRequest &&
          existing.status === MailingListMemberStatus.UNSUBSCRIBED
        ) {
          unsubscribed.add(existing.crmPersonId);
          continue;
        }

        if (existing.deleted) {
          if (isRemovalRequest) {
            alreadyDeleted.push(existing);
            continue;
          }

          reactivated.push(existing);
          continue;
        }

        if (existing.status === targetStatus) {
          if (isRemovalRequest) {
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
        status: targetStatus,
        createdAt: now,
        updatedAt: now,
        deleted: isRemovalRequest,
      }));

      const reactivateIds = reactivated.map((m) => m.id);
      const updateIds = toUpdate.map((m) => m.id);

      const createdIds = createRows.map((row) => row.id);

      let createdMembers = [];
      let createdResultCount = 0;

      const logBuffer = createLogBuffer();

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
            data: {
              deleted: false,
              status: targetStatus,
              updatedAt: now,
            },
          });
        }

        if (updateIds.length) {
          await tx.mailingListMember.updateMany({
            where: { id: { in: updateIds } },
            data: {
              status: targetStatus,
              deleted: isRemovalRequest,
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

            const isDeletion = isRemovalRequest;

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
            logBuffer.pushMany(logEntries);
          }
        }
      });

      const createdMemberIds = new Set(
        createdMembers.map((member) => member.id)
      );
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
          if (
            !alreadyActive.some((m) => m.crmPersonId === existing.crmPersonId)
          ) {
            alreadyActive.push(existing);
          }
        }
      }

      const unsubscribedIds = Array.from(unsubscribed);
      let unsubscribedDetails = [];
      if (unsubscribedIds.length) {
        const unsubscribedPeople = await prisma.crmPerson.findMany({
          where: {
            id: { in: unsubscribedIds },
          },
          select: { id: true, name: true },
        });
        const unsubscribedById = new Map(
          unsubscribedPeople.map((person) => [person.id, person])
        );
        unsubscribedDetails = unsubscribedIds.map((id) => {
          const person = unsubscribedById.get(id);
          return {
            crmPersonId: id,
            name: person?.name || null,
          };
        });
      }

      await logBuffer.flush();

      const response = {
        created: createdResultCount,
        reactivated: reactivated.length,
        updated: toUpdate.length,
        skipped: {
          alreadyActive: alreadyActive.map((m) => m.crmPersonId),
          alreadyDeleted: alreadyDeleted.map((m) => m.crmPersonId),
          unsubscribed: unsubscribedIds,
          notFound,
        },
      };

      if (unsubscribedDetails.length) {
        response.skippedDetails = {
          unsubscribed: unsubscribedDetails,
        };
      }

      return res.status(201).json(response);
    } catch (error) {
      console.error(
        `Error batch-adding members to mailing list ${mailingListId}:`,
        error
      );
      reportApiError(error, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(batchSchema));
  },
];
