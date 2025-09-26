import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { NameAndEmailFromRegistrationFactory } from "../../../../../util/getNameAndEmailFromRegistration";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(25),
  orderBy: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

const normalizeOrder = (order) => (order === "asc" ? "asc" : "desc");

const priorityRank = { participantName: 0, participantEmail: 1 };

const getRegistrationFields = async (eventId, instanceId) => {
  const fields = await prisma.registrationField.findMany({
    where: {
      eventId,
      instanceId,
      deleted: false,
      page: { deleted: false },
      type: {
        notIn: ["UPSELLS", "REGISTRATIONTIER", "RICHTEXT", "TEAM"],
      },
    },
    include: {
      options: {
        where: { deleted: false },
        select: { id: true, label: true },
        orderBy: { order: "asc" },
      },
    },
  });

  fields.sort((a, b) => {
    const rankA = priorityRank[a.fieldType] ?? 2;
    const rankB = priorityRank[b.fieldType] ?? 2;
    if (rankA !== rankB) return rankA - rankB;
    return a.order - b.order;
  });

  const byId = new Map(fields.map((field) => [field.id, field]));
  const nameField = fields.find((field) => field.fieldType === "participantName") || null;
  const emailField = fields.find((field) => field.fieldType === "participantEmail") || null;

  return { fields, byId, nameField, emailField };
};

const combineWithAnd = (fragments = []) => {
  const filtered = Array.isArray(fragments) ? fragments.filter(Boolean) : [];
  if (!filtered.length) return Prisma.sql`1 = 1`;
  return filtered.slice(1).reduce(
    (acc, fragment) => Prisma.sql`${acc} AND ${fragment}`,
    filtered[0]
  );
};

const baseWhere = ({ eventId, instanceId }) => {
  const conditions = [
    Prisma.sql`reg."eventId" = ${eventId}`,
    Prisma.sql`reg."deleted" = false`,
  ];
  if (instanceId) {
    conditions.push(Prisma.sql`reg."instanceId" = ${instanceId}`);
  }
  return combineWithAnd(conditions);
};

const buildOrderFragments = ({ orderBy, order, fieldById }) => {
  const joins = [];
  let target = Prisma.sql`reg."createdAt"`;

  if (orderBy === "updatedAt") {
    target = Prisma.sql`reg."updatedAt"`;
  } else if (orderBy === "createdAt") {
    target = Prisma.sql`reg."createdAt"`;
  } else if (orderBy === "priceSnapshot") {
    target = Prisma.sql`reg."priceSnapshot"`;
  } else if (orderBy === "finalized") {
    target = Prisma.sql`CASE WHEN reg."finalized" THEN 1 ELSE 0 END`;
  } else if (orderBy === "tier") {
    joins.push(Prisma.sql`
      LEFT JOIN "RegistrationTier" AS reg_tier_sort
        ON reg_tier_sort."id" = reg."registrationTierId"
    `);
    target = Prisma.sql`reg_tier_sort."name"`;
  } else if (orderBy === "period") {
    joins.push(Prisma.sql`
      LEFT JOIN "RegistrationPeriod" AS reg_period_sort
        ON reg_period_sort."id" = reg."registrationPeriodId"
    `);
    target = Prisma.sql`reg_period_sort."name"`;
  } else if (orderBy === "team") {
    joins.push(Prisma.sql`
      LEFT JOIN "Team" AS reg_team_sort
        ON reg_team_sort."id" = reg."teamId"
    `);
    target = Prisma.sql`reg_team_sort."name"`;
  } else if (orderBy?.startsWith?.("field:")) {
    const fieldId = orderBy.slice(6);
    if (fieldId && fieldById.has(fieldId)) {
      joins.push(Prisma.sql`
        LEFT JOIN "RegistrationFieldResponse" AS reg_field_sort
          ON reg_field_sort."registrationId" = reg."id"
         AND reg_field_sort."fieldId" = ${fieldId}
      `);
      const field = fieldById.get(fieldId);
      if (field?.type === "DROPDOWN") {
        joins.push(Prisma.sql`
          LEFT JOIN "RegistrationFieldOption" AS reg_field_sort_opt
            ON reg_field_sort_opt."id" = reg_field_sort."optionId"
        `);
        target = Prisma.sql`COALESCE(reg_field_sort_opt."label", reg_field_sort."value")`;
      } else {
        target = Prisma.sql`reg_field_sort."value"`;
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

const formatFieldValue = (field, rawValue, response) => {
  if (rawValue == null) return null;
  if (field?.type === "DROPDOWN") {
    if (response?.option?.label) return response.option.label;
    if (rawValue && typeof rawValue === "object" && "label" in rawValue)
      return rawValue.label;
    return String(rawValue ?? "");
  }
  if (field?.type === "CHECKBOX") {
    return rawValue === true || rawValue === "true" ? "Yes" : "No";
  }
  if (typeof rawValue === "object") {
    return JSON.stringify(rawValue);
  }
  return String(rawValue ?? "");
};

const mapRegistrationRecord = ({
  record,
  fields,
  factory,
  nameField,
  emailField,
}) => {
  const responseByFieldId = new Map(
    record.fieldResponses?.map((response) => [response.fieldId, response]) || []
  );

  const fieldValues = {};
  const fieldDisplay = {};
  fields.forEach((field) => {
    const response = responseByFieldId.get(field.id);
    let rawValue = response?.value ?? null;
    if (field.type === "DROPDOWN" && response?.option) {
      rawValue = { id: response.option.id, label: response.option.label };
    }
    fieldValues[field.id] = rawValue;
    fieldDisplay[field.id] = formatFieldValue(field, rawValue, response);
  });

  const { name, email } = factory.getNameAndEmail(record);

  const upsells = (record.upsells || []).map((item) => ({
    upsellItemId: item.upsellItemId,
    name: item.upsellItem?.name ?? null,
    quantity: item.quantity ?? 0,
  }));

  const upsellSummary = upsells
    .filter((entry) => entry.name)
    .map((entry) =>
      entry.quantity > 1 ? `${entry.name} (x${entry.quantity})` : entry.name
    );

  return {
    id: record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    finalized: record.finalized,
    priceSnapshot: record.priceSnapshot ?? null,
    instanceId: record.instanceId,
    instanceName: record.instance?.name ?? null,
    fields: fieldValues,
    fieldDisplay,
    flat: {
      name: nameField ? fieldDisplay[nameField.id] ?? name : name,
      email: emailField ? fieldDisplay[emailField.id] ?? email : email,
    },
    tier: {
      id: record.registrationTierId,
      name: record.registrationTier?.name ?? null,
    },
    period: {
      id: record.registrationPeriodId,
      name: record.registrationPeriod?.name ?? null,
    },
    periodPricing: {
      id: record.registrationPeriodPricingId,
      name: record.registrationPeriodPricing?.name ?? null,
    },
    team: {
      id: record.teamId,
      name: record.team?.name ?? null,
    },
    coupon: {
      id: record.couponId,
      code: record.coupon?.code ?? null,
    },
    upsells,
    upsellSummary,
  };
};

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const { eventId } = req.params;
    const instanceId = req.instanceId;

    const parseResult = querySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res
        .status(400)
        .json({ message: "Invalid query", details: parseResult.error.issues });
    }

    const { page, size } = parseResult.data;
    let orderBy = parseResult.data.orderBy || "createdAt";
    const order = normalizeOrder(parseResult.data.order);

    const { fields, byId, nameField, emailField } = await getRegistrationFields(
      eventId,
      instanceId
    );

    if (!fields.length) {
      return res.json({
        meta: { page, size, total: 0, orderBy, order },
        fields,
        rows: [],
      });
    }

    if (orderBy === "name") {
      if (nameField) orderBy = `field:${nameField.id}`;
      else orderBy = "createdAt";
    } else if (orderBy === "email") {
      if (emailField) orderBy = `field:${emailField.id}`;
      else orderBy = "createdAt";
    } else if (orderBy?.startsWith("field:")) {
      const fieldId = orderBy.slice(6);
      if (!byId.has(fieldId)) orderBy = "createdAt";
    } else if (
      !["createdAt", "updatedAt", "finalized", "priceSnapshot", "tier", "period", "team"].includes(
        orderBy
      )
    ) {
      orderBy = "createdAt";
    }

    const total = await prisma.registration.count({
      where: { eventId, instanceId, deleted: false },
    });

    const { joins, orderExpr } = buildOrderFragments({ orderBy, order, fieldById: byId });
    const whereClause = baseWhere({ eventId, instanceId });
    let joinSql = Prisma.sql``;
    joins.forEach((fragment) => {
      joinSql = Prisma.sql`${joinSql}
${fragment}`;
    });
    const offset = (page - 1) * size;

    const idRows = await prisma.$queryRaw`
      SELECT reg."id"
      FROM "Registration" AS reg
      ${joinSql}
      WHERE ${whereClause}
      ORDER BY ${orderExpr}, reg."createdAt" DESC
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

    const factory = await NameAndEmailFromRegistrationFactory.prepare(
      eventId,
      instanceId
    );

    const registrations = await prisma.registration.findMany({
      where: { id: { in: orderedIds } },
      include: {
        fieldResponses: {
          include: {
            option: { select: { id: true, label: true } },
          },
        },
        registrationTier: { select: { id: true, name: true } },
        registrationPeriod: { select: { id: true, name: true } },
        registrationPeriodPricing: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        upsells: {
          include: {
            upsellItem: { select: { id: true, name: true } },
          },
        },
        coupon: { select: { id: true, code: true } },
        instance: { select: { id: true, name: true } },
      },
    });

    const registrationById = new Map(registrations.map((entry) => [entry.id, entry]));

    const rows = orderedIds
      .map((id) => registrationById.get(id))
      .filter(Boolean)
      .map((record) =>
        mapRegistrationRecord({
          record,
          fields,
          factory,
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
