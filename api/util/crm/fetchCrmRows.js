import { prisma } from "#prisma";
import { buildCrmWhereClauses } from "./buildCrmWhereClauses.js";
import { buildOrderPlan } from "./buildOrderPlan.js";

export const fetchCrmRows = async ({
  eventId,
  includeDeleted,
  q,
  filters,
  orderBy,
  order,
  page,
  size,
  includeFieldValues = true,
}) => {
  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  const eventParam = addParam(eventId);
  const { whereSql } = buildCrmWhereClauses({
    includeDeleted,
    q,
    filters,
    addParam,
    eventParam,
  });
  const { joinClauses, orderSql } = buildOrderPlan({
    orderBy,
    order,
    addParam,
    eventParam,
  });

  const countParams = [...params];
  const countRows = await prisma.$queryRawUnsafe(
    `
      SELECT COUNT(*)::int AS count
      FROM "CrmPerson" p
      ${whereSql}
    `,
    ...countParams
  );
  const total = Number(countRows?.[0]?.count || 0);

  const offset = (page - 1) * size;
  const offsetParam = addParam(offset);
  const limitParam = addParam(offset + size);

  const fieldSelectSql = includeFieldValues
    ? `,
        COALESCE(fieldAgg.data, '[]'::jsonb) AS "fieldValues"`
    : "";

  const fieldJoinSql = includeFieldValues
    ? `
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', f.id,
            'crmFieldId', f."crmFieldId",
            'crmPersonId', f."crmPersonId",
            'value', f.value,
            'metadata', f.metadata,
            'createdAt', f."createdAt",
            'updatedAt', f."updatedAt"
          ) ORDER BY f."createdAt" DESC
        ) AS data
        FROM "CrmPersonField" f
        WHERE f."crmPersonId" = base.id
      ) fieldAgg ON true
    `
    : "";

  const crmRows = await prisma.$queryRawUnsafe(
    `
      WITH base AS (
        SELECT
          p.*,
          COALESCE(lifetime.value, 0)::double precision AS lifetime_value,
          ROW_NUMBER() OVER (ORDER BY ${orderSql}) AS row_number
        FROM "CrmPerson" p
        ${joinClauses.join("\n")}
        ${whereSql}
      )
      SELECT
        base.*,
        COALESCE(emailAgg.data, '[]'::jsonb) AS emails,
        COALESCE(phoneAgg.data, '[]'::jsonb) AS phones
        ${fieldSelectSql}
      FROM base
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', e.id,
            'crmPersonId', e."crmPersonId",
            'email', e.email,
            'label', e.label,
            'notes', e.notes,
            'createdAt', e."createdAt",
            'updatedAt', e."updatedAt",
            'deleted', e.deleted
          ) ORDER BY e."createdAt" DESC
        ) AS data
        FROM "CrmPersonEmail" e
        WHERE e."crmPersonId" = base.id
          ${includeDeleted ? "" : 'AND e."deleted" = false'}
      ) emailAgg ON true
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', ph.id,
            'crmPersonId', ph."crmPersonId",
            'phone', ph.phone,
            'label', ph.label,
            'notes', ph.notes,
            'createdAt', ph."createdAt",
            'updatedAt', ph."updatedAt",
            'deleted', ph.deleted
          ) ORDER BY ph."createdAt" DESC
        ) AS data
        FROM "CrmPersonPhone" ph
        WHERE ph."crmPersonId" = base.id
      ) phoneAgg ON true
      ${fieldJoinSql}
      WHERE base.row_number > ${offsetParam}
        AND base.row_number <= ${limitParam}
      ORDER BY base.row_number
    `,
    ...params
  );

  const lifetimeMap = new Map();
  const crmPersons = crmRows.map((row) => {
    const { lifetime_value, emails = [], phones = [], fieldValues = [], ...rest } = row;
    lifetimeMap.set(rest.id, Number(lifetime_value || 0));
    return {
      ...rest,
      emails: Array.isArray(emails) ? emails : [],
      phones: Array.isArray(phones) ? phones : [],
      fieldValues:
        includeFieldValues && Array.isArray(fieldValues) ? fieldValues : [],
    };
  });

  return { crmPersons, total, lifetimeMap };
};
