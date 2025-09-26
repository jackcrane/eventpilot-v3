import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import {
  formatFormResponse,
  groupByLocationAndJob,
} from "../submission/[submissionId]";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(25),
  orderBy: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

const normalizeOrder = (order) => (order === "asc" ? "asc" : "desc");

const getVolunteerFields = async (eventId, instanceId) => {
  const fields = await prisma.volunteerRegistrationField.findMany({
    where: { eventId, instanceId, deleted: false },
    orderBy: { order: "asc" },
    select: {
      id: true,
      label: true,
      type: true,
      eventpilotFieldType: true,
      required: true,
      order: true,
      options: {
        where: { deleted: false },
        select: { id: true, label: true },
        orderBy: { order: "asc" },
      },
    },
  });

  const byId = new Map(fields.map((field) => [field.id, field]));
  const byPilotType = new Map();
  fields.forEach((field) => {
    if (field?.eventpilotFieldType) {
      byPilotType.set(field.eventpilotFieldType, field);
    }
  });

  return { fields, byId, byPilotType };
};

const buildOrderFragments = ({ orderBy, order, fieldById }) => {
  const joins = [];
  let target = Prisma.sql`fr."createdAt"`;

  if (orderBy === "updatedAt") {
    target = Prisma.sql`fr."updatedAt"`;
  } else if (orderBy === "createdAt") {
    target = Prisma.sql`fr."createdAt"`;
  } else if (orderBy?.startsWith?.("field:")) {
    const fieldId = orderBy.slice(6);
    if (fieldId && fieldById.has(fieldId)) {
      joins.push(Prisma.sql`
        LEFT JOIN "FieldResponse" AS fr_field_sort
          ON fr_field_sort."responseId" = fr."id"
         AND fr_field_sort."fieldId" = ${fieldId}
      `);

      const field = fieldById.get(fieldId);
      if (field?.type === "dropdown") {
        joins.push(Prisma.sql`
          LEFT JOIN "FormFieldOption" AS fr_field_sort_opt
            ON fr_field_sort_opt."id" = fr_field_sort."value"
        `);
        target = Prisma.sql`COALESCE(fr_field_sort_opt."label", fr_field_sort."value")`;
      } else {
        target = Prisma.sql`fr_field_sort."value"`;
      }
    }
  }

  const direction = normalizeOrder(order) === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const orderExpr = Prisma.sql`${target} ${direction} NULLS LAST`;

  return {
    joins,
    orderExpr,
  };
};

const combineWithAnd = (fragments = []) => {
  const filtered = Array.isArray(fragments) ? fragments.filter(Boolean) : [];
  if (!filtered.length) return Prisma.sql`1 = 1`;
  return filtered.slice(1).reduce(
    (acc, fragment) => Prisma.sql`${acc} AND ${fragment}`,
    filtered[0]
  );
};

const escapeLike = (value = "") =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");

const likeExpression = (column, pattern) =>
  Prisma.sql`${column} ILIKE ${pattern} ESCAPE '\\'`; // eslint-disable-line no-useless-escape

const notLikeExpression = (column, pattern) =>
  Prisma.sql`NOT (${column} ILIKE ${pattern} ESCAPE '\\')`;

const buildStringComparison = (column, operation, rawValue) => {
  const op = String(operation || "").toLowerCase();
  if (op === "exists") return Prisma.sql`${column} IS NOT NULL AND ${column} <> ''`;
  if (op === "not-exists") return Prisma.sql`${column} IS NULL OR ${column} = ''`;

  const value = rawValue == null ? "" : String(rawValue);
  const trimmed = value.trim();
  if (!trimmed) return null;

  const containsPattern = `%${escapeLike(trimmed)}%`;
  const prefixPattern = `${escapeLike(trimmed)}%`;
  const suffixPattern = `%${escapeLike(trimmed)}`;
  const exactPattern = escapeLike(trimmed);

  switch (op) {
    case "contains":
      return likeExpression(column, containsPattern);
    case "not-contains":
      return notLikeExpression(column, containsPattern);
    case "starts-with":
      return likeExpression(column, prefixPattern);
    case "ends-with":
      return likeExpression(column, suffixPattern);
    case "eq":
      return likeExpression(column, exactPattern);
    case "neq":
      return notLikeExpression(column, exactPattern);
    default:
      return null;
  }
};

const buildDateComparison = (column, operation, rawValue) => {
  const op = String(operation || "").toLowerCase();
  if (op === "exists") return Prisma.sql`${column} IS NOT NULL`;
  if (op === "not-exists") return Prisma.sql`${column} IS NULL`;

  if (!rawValue) return null;
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return null;

  switch (op) {
    case "date-after":
    case "greater-than":
      return Prisma.sql`${column} > ${date}`;
    case "date-before":
    case "less-than":
      return Prisma.sql`${column} < ${date}`;
    case "greater-than-or-equal":
      return Prisma.sql`${column} >= ${date}`;
    case "less-than-or-equal":
      return Prisma.sql`${column} <= ${date}`;
    case "eq":
      return Prisma.sql`${column} = ${date}`;
    case "neq":
      return Prisma.sql`${column} <> ${date}`;
    default:
      return null;
  }
};

const buildFieldFilterClause = ({ fieldId, operation, value }) => {
  const op = String(operation || "").toLowerCase();
  const column = Prisma.sql`COALESCE(fr_field_filter_opt."label", fr_field_filter."value")`;

  if (op === "exists") {
    return Prisma.sql`EXISTS (
      SELECT 1
      FROM "FieldResponse" AS fr_field_filter
      LEFT JOIN "FormFieldOption" AS fr_field_filter_opt
        ON fr_field_filter_opt."id" = fr_field_filter."value"
      WHERE fr_field_filter."responseId" = fr."id"
        AND fr_field_filter."fieldId" = ${fieldId}
        AND ${column} IS NOT NULL
        AND ${column} <> ''
    )`;
  }

  if (op === "not-exists") {
    return Prisma.sql`NOT EXISTS (
      SELECT 1
      FROM "FieldResponse" AS fr_field_filter
      LEFT JOIN "FormFieldOption" AS fr_field_filter_opt
        ON fr_field_filter_opt."id" = fr_field_filter."value"
      WHERE fr_field_filter."responseId" = fr."id"
        AND fr_field_filter."fieldId" = ${fieldId}
        AND ${column} IS NOT NULL
        AND ${column} <> ''
    )`;
  }

  const normalized = value == null ? "" : String(value).trim();
  if (!normalized) return null;

  const containsPattern = `%${escapeLike(normalized)}%`;
  const prefixPattern = `${escapeLike(normalized)}%`;
  const suffixPattern = `%${escapeLike(normalized)}`;
  const exactPattern = escapeLike(normalized);

  const baseSelect = Prisma.sql`
    SELECT 1
    FROM "FieldResponse" AS fr_field_filter
    LEFT JOIN "FormFieldOption" AS fr_field_filter_opt
      ON fr_field_filter_opt."id" = fr_field_filter."value"
    WHERE fr_field_filter."responseId" = fr."id"
      AND fr_field_filter."fieldId" = ${fieldId}
  `;

  const existsWith = (expression) =>
    Prisma.sql`EXISTS (
      ${baseSelect}
        AND ${expression}
    )`;

  const notExistsWith = (expression) =>
    Prisma.sql`NOT EXISTS (
      ${baseSelect}
        AND ${expression}
    )`;

  switch (op) {
    case "contains":
      return existsWith(likeExpression(column, containsPattern));
    case "not-contains":
      return notExistsWith(likeExpression(column, containsPattern));
    case "starts-with":
      return existsWith(likeExpression(column, prefixPattern));
    case "ends-with":
      return existsWith(likeExpression(column, suffixPattern));
    case "eq":
      return existsWith(likeExpression(column, exactPattern));
    case "neq":
      return notExistsWith(likeExpression(column, exactPattern));
    default:
      return null;
  }
};

const buildSearchClause = (term) => {
  if (!term) return null;
  const pattern = `%${escapeLike(term)}%`;

  return Prisma.sql`(
    EXISTS (
      SELECT 1
      FROM "FieldResponse" AS search_fr
      LEFT JOIN "FormFieldOption" AS search_opt
        ON search_opt."id" = search_fr."value"
      WHERE search_fr."responseId" = fr."id"
        AND (
          search_fr."value" ILIKE ${pattern} ESCAPE '\\'
          OR search_opt."label" ILIKE ${pattern} ESCAPE '\\'
        )
    )
    OR EXISTS (
      SELECT 1
      FROM "VolunteerShiftSignup" AS search_signup
      JOIN "Shift" AS search_shift ON search_shift."id" = search_signup."shiftId"
      LEFT JOIN "Job" AS search_job ON search_job."id" = search_shift."jobId"
      LEFT JOIN "Location" AS search_location ON search_location."id" = search_shift."locationId"
      WHERE search_signup."formResponseId" = fr."id"
        AND (
          search_job."name" ILIKE ${pattern} ESCAPE '\\'
          OR search_location."name" ILIKE ${pattern} ESCAPE '\\'
        )
    )
    OR EXISTS (
      SELECT 1
      FROM "EventInstance" AS search_instance
      WHERE search_instance."id" = fr."instanceId"
        AND search_instance."name" ILIKE ${pattern} ESCAPE '\\'
    )
  )`;
};

const buildVolunteerFilterClause = ({ filter, fieldById }) => {
  if (!filter || !filter.path || !filter.operation) return null;
  const { path, operation, value } = filter;
  if (path === "createdAt") {
    return buildDateComparison(Prisma.sql`fr."createdAt"`, operation, value);
  }
  if (path === "updatedAt") {
    return buildDateComparison(Prisma.sql`fr."updatedAt"`, operation, value);
  }
  if (path.startsWith("field:")) {
    const fieldId = path.slice(6);
    if (!fieldId || !fieldById.has(fieldId)) return null;
    return buildFieldFilterClause({ fieldId, operation, value });
  }
  return null;
};

const formatFieldValue = (field, value) => {
  if (value == null) return null;
  if (field?.type === "dropdown") {
    if (value && typeof value === "object" && "label" in value) {
      return value.label;
    }
    return String(value ?? "");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value ?? "");
};

const mapVolunteerRecord = ({ record, fields, nameField, emailField }) => {
  const formatted = formatFormResponse(record, fields);
  const fieldValues = {};
  const fieldDisplay = {};
  fields.forEach((field) => {
    const raw = formatted[field.id];
    fieldValues[field.id] = raw ?? null;
    fieldDisplay[field.id] = formatFieldValue(field, raw);
  });

  const groupedShifts = groupByLocationAndJob(record.shifts || []);
  const jobs = new Set();
  const locations = new Set();
  const shiftDetails = [];

  record.shifts?.forEach((signup) => {
    const shift = signup.shift;
    if (!shift) return;
    const job = shift.job;
    const location = job?.location;
    if (job?.name) jobs.add(job.name);
    if (location?.name) locations.add(location.name);
    shiftDetails.push({
      id: shift.id,
      jobId: job?.id ?? null,
      jobName: job?.name ?? null,
      locationId: location?.id ?? null,
      locationName: location?.name ?? null,
      startTime: shift.startTime,
      endTime: shift.endTime,
      startTimeTz: shift.startTimeTz,
      endTimeTz: shift.endTimeTz,
    });
  });

  return {
    id: record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    instanceId: record.instanceId,
    instanceName: record.instance?.name ?? null,
    fields: fieldValues,
    fieldDisplay,
    jobs: Array.from(jobs),
    locations: Array.from(locations),
    shiftCount: shiftDetails.length,
    shifts: shiftDetails,
    groupedShifts,
    flat: {
      name: nameField ? fieldDisplay[nameField.id] ?? null : null,
      email: emailField ? fieldDisplay[emailField.id] ?? null : null,
    },
  };
};

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const { eventId } = req.params;
    const instanceId = req.instanceId;
    const parseResult = querySchema.safeParse(req.query);

    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid query", details: parseResult.error.issues });
    }

    const { page, size } = parseResult.data;
    let orderBy = parseResult.data.orderBy || "createdAt";
    const order = normalizeOrder(parseResult.data.order);

    const { fields, byId, byPilotType } = await getVolunteerFields(eventId, instanceId);

    if (!byId.size) {
      return res.json({
        meta: { page, size, total: 0, orderBy, order },
        fields,
        rows: [],
      });
    }

    if (orderBy === "name") {
      const nameField = byPilotType.get("volunteerName");
      if (nameField) orderBy = `field:${nameField.id}`;
      else orderBy = "createdAt";
    } else if (orderBy === "email") {
      const emailField = byPilotType.get("volunteerEmail");
      if (emailField) orderBy = `field:${emailField.id}`;
      else orderBy = "createdAt";
    } else if (orderBy?.startsWith("field:")) {
      const fieldId = orderBy.slice(6);
      if (!byId.has(fieldId)) {
        orderBy = "createdAt";
      }
    } else if (orderBy !== "createdAt" && orderBy !== "updatedAt") {
      orderBy = "createdAt";
    }

    const searchTerm =
      typeof req.query.q === "string" ? req.query.q.trim() : "";

    let parsedFilters = [];
    if (typeof req.query.filters === "string") {
      try {
        const maybe = JSON.parse(req.query.filters);
        if (Array.isArray(maybe)) parsedFilters = maybe;
      } catch (error) {
        void error;
      }
    }

    const normalizedFilters = parsedFilters
      .map((entry) => {
        if (!entry || typeof entry.path !== "string") return null;
        if (!entry.operation) return null;
        return {
          path: entry.path,
          operation: entry.operation,
          value: entry.value ?? null,
        };
      })
      .filter(Boolean);

    const conditions = [
      Prisma.sql`fr."eventId" = ${eventId}`,
      Prisma.sql`fr."deleted" = false`,
    ];
    if (instanceId) {
      conditions.push(Prisma.sql`fr."instanceId" = ${instanceId}`);
    }

    const searchClause = buildSearchClause(searchTerm);
    if (searchClause) conditions.push(searchClause);

    normalizedFilters.forEach((filter) => {
      const clause = buildVolunteerFilterClause({ filter, fieldById: byId });
      if (clause) conditions.push(clause);
    });

    const whereClause = combineWithAnd(conditions);

    const { joins, orderExpr } = buildOrderFragments({
      orderBy,
      order,
      fieldById: byId,
    });

    let joinSql = Prisma.sql``;
    joins.forEach((fragment) => {
      joinSql = Prisma.sql`${joinSql}
${fragment}`;
    });

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT fr."id")::int AS count
      FROM "FormResponse" AS fr
      ${joinSql}
      WHERE ${whereClause}
    `;

    const total = Number(totalRows?.[0]?.count ?? 0);

    const offset = (page - 1) * size;

    const idRows = await prisma.$queryRaw`
      SELECT fr."id"
      FROM "FormResponse" AS fr
      ${joinSql}
      WHERE ${whereClause}
      ORDER BY ${orderExpr}, fr."createdAt" DESC
      OFFSET ${offset}
      LIMIT ${size}
    `;

    const orderedIds = idRows.map((row) => row.id);

    if (!orderedIds.length) {
      return res.json({
        meta: { page, size, total, orderBy, order },
        fields,
        rows: [],
      });
    }

    const registrations = await prisma.volunteerRegistration.findMany({
      where: { id: { in: orderedIds } },
      include: {
        fieldResponses: {
          select: {
            fieldId: true,
            value: true,
            field: {
              select: {
                id: true,
                label: true,
                type: true,
                eventpilotFieldType: true,
                options: {
                  select: { id: true, label: true, deleted: true },
                },
              },
            },
          },
        },
        shifts: {
          include: {
            shift: {
              include: {
                job: {
                  include: {
                    location: true,
                  },
                },
              },
            },
          },
        },
        instance: {
          select: { id: true, name: true },
        },
      },
    });

    const registrationsById = new Map(registrations.map((r) => [r.id, r]));
    const nameField = byPilotType.get("volunteerName") || null;
    const emailField = byPilotType.get("volunteerEmail") || null;

    const rows = orderedIds
      .map((id) => registrationsById.get(id))
      .filter(Boolean)
      .map((record) =>
        mapVolunteerRecord({
          record,
          fields,
          nameField,
          emailField,
        })
      );

    return res.json({
      meta: { page, size, total, orderBy, order },
      fields,
      rows,
    });
  },
];
