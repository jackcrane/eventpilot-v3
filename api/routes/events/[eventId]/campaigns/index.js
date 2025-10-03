import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { verifyAuth } from "#verifyAuth";
import { z } from "zod";
import { zerialize } from "zodex";
import { dispatchCampaign } from "#util/campaignDispatch";

const SORTABLE_FIELDS = ["name", "sendAt", "createdAt", "status"];

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
    console.warn("Failed to parse campaign filters", error);
    return [];
  }
};

const buildTextCondition = (operation, value, scope) => {
  const text = toStringValue(value);
  const scoped = (condition) => scope(condition);

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
      return scoped({ equals: null });
    default:
      return null;
  }
};

const buildDateCondition = (operation, value, scope) => {
  const date = parseDateValue(value);

  switch (operation) {
    case "eq":
      if (!date) return null;
      return scope(date);
    case "neq":
      if (!date) return null;
      return { NOT: scope(date) };
    case "date-after":
      if (!date) return null;
      return scope({ gte: date });
    case "date-before":
      if (!date) return null;
      return scope({ lte: date });
    case "exists":
      return scope({ not: null });
    case "not-exists":
      return scope(null);
    default:
      return null;
  }
};

const STATUS_CONDITIONS = {
  SENT: { sendEffortStarted: true },
  SCHEDULED: { sendEffortStarted: false, sendAt: { not: null } },
  DRAFT: { sendEffortStarted: false, sendAt: null },
};

const buildStatusCondition = (operation, rawValue) => {
  const text = toStringValue(rawValue);
  if (!text) return null;
  const normalized = text.toUpperCase();
  const baseCondition = STATUS_CONDITIONS[normalized];
  if (!baseCondition) return null;

  if (operation === "eq") {
    return baseCondition;
  }

  if (operation === "neq") {
    return { NOT: baseCondition };
  }

  if (operation === "exists") {
    return { sendEffortStarted: { not: null } };
  }

  if (operation === "not-exists") {
    return { sendEffortStarted: null };
  }

  return null;
};

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(SORTABLE_FIELDS).optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  q: z.string().trim().min(1).max(120).optional(),
});

export const campaignSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    templateId: z.string().cuid(),
    mailingListId: z.string().cuid(),
    sendImmediately: z.boolean().optional().default(false),
    sendAt: z.string().datetime().nullish(),
    sendAtTz: z.string().trim().min(1).nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.sendImmediately) {
      return;
    }

    if (!data.sendAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Send time is required when not sending immediately.",
        path: ["sendAt"],
      });
    }

    if (!data.sendAtTz) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Timezone is required when scheduling a send.",
        path: ["sendAtTz"],
      });
    }
  });

export const baseCampaignSelect = {
  id: true,
  name: true,
  eventId: true,
  templateId: true,
  mailingListId: true,
  sendImmediately: true,
  sendEffortStarted: true,
  sendAt: true,
  sendAtTz: true,
  createdAt: true,
  updatedAt: true,
  template: {
    select: {
      id: true,
      name: true,
      deleted: true,
    },
  },
  mailingList: {
    select: {
      id: true,
      title: true,
      deleted: true,
    },
  },
};

const deriveCampaignStatus = (campaign) => {
  if (campaign.sendEffortStarted) {
    return "SENT";
  }

  if (campaign.sendAt) {
    return "SCHEDULED";
  }

  return "DRAFT";
};

export const formatCampaign = (campaign) => ({
  ...campaign,
  status: deriveCampaignStatus(campaign),
  template: campaign.template
    ? {
        id: campaign.template.id,
        name: campaign.template.name,
        deleted: campaign.template.deleted,
      }
    : null,
  mailingList: campaign.mailingList
    ? {
        id: campaign.mailingList.id,
        title: campaign.mailingList.title,
        deleted: campaign.mailingList.deleted,
      }
    : null,
});

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;

    try {
      const parsedQuery = querySchema.safeParse(req.query || {});

      if (!parsedQuery.success) {
        return res.status(400).json({ message: "Invalid query parameters" });
      }

      const {
        page: requestedPage,
        size,
        sortBy: rawSortBy,
        sortDirection: rawDirection,
        q,
      } = parsedQuery.data;

      const searchTerm = toStringValue(q);
      const filters = parseFilters(req.query.filters);

      const filterConditions = [];

      for (const filter of filters) {
        const { label, operation, value } = filter;
        if (!label || !operation) continue;
        let condition = null;

        switch (label) {
          case "status":
            condition = buildStatusCondition(operation, value);
            break;
          case "name":
            condition = buildTextCondition(operation, value, (clause) => ({
              name: clause,
            }));
            break;
          case "template":
            condition = buildTextCondition(operation, value, (clause) => ({
              template: { name: clause },
            }));
            break;
          case "mailingList":
            condition = buildTextCondition(operation, value, (clause) => ({
              mailingList: { title: clause },
            }));
            break;
          case "sendAt":
            condition = buildDateCondition(operation, value, (clause) => ({
              sendAt: clause,
            }));
            break;
          case "createdAt":
            condition = buildDateCondition(operation, value, (clause) => ({
              createdAt: clause,
            }));
            break;
          default:
            break;
        }

        if (condition) {
          filterConditions.push(condition);
        }
      }

      const whereClauses = filterConditions.length
        ? [
            {
              AND: filterConditions,
            },
          ]
        : [];

      if (searchTerm) {
        whereClauses.push({
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { template: { name: { contains: searchTerm, mode: "insensitive" } } },
            {
              mailingList: {
                title: { contains: searchTerm, mode: "insensitive" },
              },
            },
          ],
        });
      }

      const where = whereClauses.length
        ? {
            eventId,
            AND: whereClauses,
          }
        : { eventId };

      const totalItems = await prisma.campaign.count({ where });
      const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(size, 1)));
      const page = Math.min(Math.max(requestedPage, 1), totalPages);
      const skip = (page - 1) * size;

      const sortBy = rawSortBy && SORTABLE_FIELDS.includes(rawSortBy)
        ? rawSortBy
        : "createdAt";
      const sortDirection = rawDirection === "asc" ? "asc" : "desc";

      const orderBy = (() => {
        switch (sortBy) {
          case "name":
            return { name: sortDirection };
          case "sendAt":
            return { sendAt: sortDirection };
          case "status":
            return [
              { sendEffortStarted: sortDirection },
              { sendAt: sortDirection },
            ];
          default:
            return { createdAt: sortDirection };
        }
      })();

      const campaigns = await prisma.campaign.findMany({
        where,
        select: baseCampaignSelect,
        orderBy,
        skip,
        take: size,
      });

      return res.json({
        campaigns: campaigns.map((c) => formatCampaign(c)),
        meta: {
          page,
          size,
          totalItems,
          totalPages,
          sortBy,
          sortDirection,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
          query: searchTerm,
          filters,
        },
      });
    } catch (error) {
      console.error(`Error fetching campaigns for event ${eventId}:`, error);
      reportApiError(error, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const result = campaignSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    const {
      name,
      templateId,
      mailingListId,
      sendImmediately = false,
      sendAt,
      sendAtTz,
    } = result.data;

    try {
      const [template, mailingList] = await Promise.all([
        prisma.emailTemplate.findFirst({
          where: { id: templateId, eventId, deleted: false },
          select: { id: true },
        }),
        prisma.mailingList.findFirst({
          where: { id: mailingListId, eventId, deleted: false },
          select: { id: true },
        }),
      ]);

      if (!template) {
        return res
          .status(400)
          .json({ message: "Template not found for this event." });
      }

      if (!mailingList) {
        return res
          .status(400)
          .json({ message: "Mailing list not found for this event." });
      }

      const now = new Date();
      const scheduledSend = sendImmediately ? now : sendAt;
      const scheduledTz = sendImmediately ? null : sendAtTz;

      if (scheduledSend && Number.isNaN(new Date(scheduledSend).getTime())) {
        return res
          .status(400)
          .json({ message: "Invalid send time provided." });
      }

      const created = await prisma.campaign.create({
        data: {
          name,
          templateId,
          mailingListId,
          eventId,
          sendImmediately,
          sendAt: scheduledSend ? new Date(scheduledSend) : null,
          sendAtTz: scheduledTz ?? null,
        },
        select: baseCampaignSelect,
      });

      if (sendImmediately) {
        dispatchCampaign({
          campaignId: created.id,
          initiatedByUserId: req.user.id,
          reqId: req.id,
        }).catch((err) => {
          console.error(
            `[${req.id}] Failed to dispatch immediate campaign ${created.id}:`,
            err
          );
        });
      }

      return res.status(201).json({ campaign: formatCampaign(created) });
    } catch (error) {
      console.error(`Error creating campaign for event ${eventId}:`, error);
      reportApiError(error, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(campaignSchema));
  },
];
