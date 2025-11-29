import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { LogType } from "@prisma/client";
import { collapseCrmValues } from "..";
import { serializeError } from "#serializeError";
import { personSchema } from "./[personId]";
import express from "express";
import { sendEmail } from "#postmark";
import ImportFinishedEmail from "#emails/import-finished.jsx";
import { render } from "@react-email/render";
import { reportApiError } from "#util/reportApiError.js";

const parseFieldValue = (raw) => {
  if (raw == null) return "";
  const value = String(raw).trim();
  if (!value) return "";
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === "[" && last === "]") || (first === "{" && last === "}")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => (entry == null ? "" : String(entry)))
          .filter(Boolean)
          .join(", ");
      }
      if (parsed && typeof parsed === "object") {
        return Object.values(parsed)
          .map((entry) => (entry == null ? "" : String(entry)))
          .filter(Boolean)
          .join(", ");
      }
    } catch (error) {
      void error;
    }
  }
  return value;
};

const formatFieldResponses = (responses = []) =>
  responses
    .map((response) => {
      const label = response?.field?.label?.trim();
      const fieldId = response?.field?.id ?? response?.fieldId ?? null;
      const rawValue =
        response?.option?.label ??
        (response?.value != null ? String(response.value) : null);
      const parsedValue = parseFieldValue(rawValue);
      if (!fieldId || !label || !parsedValue) return null;
      return { fieldId, label, value: parsedValue };
    })
    .filter(Boolean);

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;

    // --- lightweight timing instrumentation ---
    const NS_PER_MS = 1_000_000n;
    const startNs = process.hrtime.bigint();
    let lastNs = startNs;
    const tmark = (label, extra = {}) => {
      const now = process.hrtime.bigint();
      const sinceLastMs = Number(now - lastNs) / Number(NS_PER_MS);
      const totalMs = Number(now - startNs) / Number(NS_PER_MS);
      lastNs = now;
      console.log(
        `[CRM GET] ${label} +${sinceLastMs.toFixed(3)}ms (total ${totalMs.toFixed(
          3
        )}ms) ${Object.keys(extra).length ? JSON.stringify(extra) : ""}`
      );
    };

    try {
      const page = Math.max(parseInt(req.query.page ?? "1", 10), 1);
      const size = Math.min(
        Math.max(parseInt(req.query.size ?? "50", 10), 1),
        200
      );

      // Optional sorting: orderBy (accessor) and order (asc/desc)
      const order =
        (req.query.order || "desc").toLowerCase() === "asc" ? "asc" : "desc";
      const orderBy =
        typeof req.query.orderBy === "string" ? req.query.orderBy : null;

      const includeDeleted = Boolean(req.query.includeDeleted);

      // Text search across common fields
      const q = (req.query.q || "").toString().trim();

      const params = [];
      const addParam = (value) => {
        params.push(value);
        return `$${params.length}`;
      };

      const whereClauses = [];
      const eventParam = addParam(eventId);
      whereClauses.push(`p."eventId" = ${eventParam}`);
      if (!includeDeleted) {
        whereClauses.push(`p."deleted" = false`);
      }

      if (q) {
        const qPattern = addParam(`%${q}%`);
        const emailDeletedClause = includeDeleted
          ? ""
          : 'AND e."deleted" = false';
        whereClauses.push(
          `(
            p.name ILIKE ${qPattern}
            OR p.source ILIKE ${qPattern}
            OR p."stripe_customerId" ILIKE ${qPattern}
            OR EXISTS (
              SELECT 1
              FROM "CrmPersonEmail" e
              WHERE e."crmPersonId" = p.id
                ${emailDeletedClause}
                AND e.email ILIKE ${qPattern}
            )
            OR EXISTS (
              SELECT 1
              FROM "CrmPersonPhone" ph
              WHERE ph."crmPersonId" = p.id
                AND ph.phone ILIKE ${qPattern}
            )
            OR EXISTS (
              SELECT 1
              FROM "CrmPersonField" f
              WHERE f."crmPersonId" = p.id
                AND f.value ILIKE ${qPattern}
            )
          )`
        );
      }
      tmark("Parsed query params & text search", {
        q,
        page,
        size,
        orderBy,
        order,
      });

      // Filter parsing: expect JSON stringified array of { path, operation, value }
      let filters = [];
      if (req.query.filters) {
        try {
          const parsed = JSON.parse(req.query.filters);
          if (Array.isArray(parsed)) filters = parsed;
        } catch (_) {
          void _;
        }
      }
      tmark("Parsed filters", { filtersCount: filters.length });

      const buildStringComparison = (expr, op, rawVal) => {
        const value = rawVal == null ? "" : String(rawVal).trim();
        const normalizedExpr = `COALESCE(${expr}, '')`;
        const lowerExpr = `LOWER(${normalizedExpr})`;
        if (op === "exists") return `${normalizedExpr} <> ''`;
        if (op === "not-exists") return `${normalizedExpr} = ''`;
        if (!value) return null;
        if (op === "eq") return `${lowerExpr} = LOWER(${addParam(value)})`;
        if (op === "neq")
          return `NOT (${lowerExpr} = LOWER(${addParam(value)}))`;
        if (op === "contains")
          return `${normalizedExpr} ILIKE ${addParam(`%${value}%`)}`;
        if (op === "not-contains")
          return `NOT (${normalizedExpr} ILIKE ${addParam(`%${value}%`)})`;
        if (op === "starts-with")
          return `${normalizedExpr} ILIKE ${addParam(`${value}%`)}`;
        if (op === "ends-with")
          return `${normalizedExpr} ILIKE ${addParam(`%${value}`)}`;
        return null;
      };

      const buildDateComparison = (expr, op, rawVal) => {
        if (op === "exists") return `${expr} IS NOT NULL`;
        if (op === "not-exists") return `${expr} IS NULL`;
        if (!rawVal) return null;
        const date = new Date(rawVal);
        if (Number.isNaN(date.getTime())) return null;
        const param = addParam(date);
        if (op === "date-after" || op === "greater-than")
          return `${expr} > ${param}`;
        if (op === "date-before" || op === "less-than")
          return `${expr} < ${param}`;
        if (op === "greater-than-or-equal") return `${expr} >= ${param}`;
        if (op === "less-than-or-equal") return `${expr} <= ${param}`;
        if (op === "eq") return `${expr} = ${param}`;
        if (op === "neq") return `${expr} <> ${param}`;
        return null;
      };

      const buildRelationStringClause = ({
        table,
        alias,
        column,
        op,
        value,
        extraConditions = [],
      }) => {
        const baseConditions = [
          `${alias}."crmPersonId" = p.id`,
          ...extraConditions,
        ];
        if (op === "exists") {
          return `EXISTS (SELECT 1 FROM ${table} ${alias} WHERE ${baseConditions.join(
            " AND "
          )})`;
        }
        if (op === "not-exists") {
          return `NOT EXISTS (SELECT 1 FROM ${table} ${alias} WHERE ${baseConditions.join(
            " AND "
          )})`;
        }
        const comparison = buildStringComparison(
          `${alias}.${column}`,
          op,
          value
        );
        if (!comparison) return null;
        return `EXISTS (SELECT 1 FROM ${table} ${alias} WHERE ${baseConditions.join(
          " AND "
        )} AND ${comparison})`;
      };

      const buildFieldClause = (fieldId, op, rawVal) => {
        if (!fieldId) return null;
        const fieldParam = addParam(fieldId);
        const baseConditions = `f."crmPersonId" = p.id AND f."crmFieldId" = ${fieldParam}`;
        if (op === "exists") {
          return `EXISTS (SELECT 1 FROM "CrmPersonField" f WHERE ${baseConditions})`;
        }
        if (op === "not-exists") {
          return `NOT EXISTS (SELECT 1 FROM "CrmPersonField" f WHERE ${baseConditions})`;
        }
        if (
          [
            "eq",
            "neq",
            "contains",
            "not-contains",
            "starts-with",
            "ends-with",
          ].includes(op)
        ) {
          const comparison = buildStringComparison("f.value", op, rawVal);
          if (!comparison) return null;
          return `EXISTS (SELECT 1 FROM "CrmPersonField" f WHERE ${baseConditions} AND ${comparison})`;
        }
        if (
          [
            "greater-than",
            "greater-than-or-equal",
            "less-than",
            "less-than-or-equal",
          ].includes(op)
        ) {
          const numeric = Number(rawVal);
          if (!Number.isFinite(numeric)) return null;
          const comparator =
            op === "greater-than"
              ? ">"
              : op === "greater-than-or-equal"
                ? ">="
                : op === "less-than"
                  ? "<"
                  : "<=";
          const numericParam = addParam(numeric);
          return `EXISTS (
            SELECT 1
            FROM "CrmPersonField" f
            WHERE ${baseConditions}
              AND CASE
                    WHEN f.value ~ '^-?[0-9]+(\\.[0-9]+)?$'
                    THEN (f.value)::double precision
                    ELSE NULL
                  END ${comparator} ${numericParam}
          )`;
        }
        if (op === "date-after" || op === "date-before") {
          const date = rawVal ? new Date(rawVal) : null;
          if (!date || Number.isNaN(date.getTime())) return null;
          const comparator = op === "date-after" ? ">" : "<";
          const dateParam = addParam(date);
          return `EXISTS (
            SELECT 1
            FROM "CrmPersonField" f
            WHERE ${baseConditions}
              AND NULLIF(f.value, '')::timestamptz ${comparator} ${dateParam}
          )`;
        }
        return null;
      };

      for (const f of filters) {
        if (!f || !f.path || !f.operation) continue;
        const op = String(f.operation);
        const path = String(f.path);
        const val = f.value == null ? null : String(f.value);
        let clause = null;

        if (
          path === "name" ||
          path === "source" ||
          path === "stripe_customerId"
        ) {
          clause = buildStringComparison(`p."${path}"`, op, val);
        } else if (path === "createdAt" || path === "updatedAt") {
          clause = buildDateComparison(`p."${path}"`, op, val);
        } else if (path === "emails") {
          clause = buildRelationStringClause({
            table: '"CrmPersonEmail"',
            alias: "e",
            column: '"email"',
            op,
            value: val,
            extraConditions: includeDeleted ? [] : ['e."deleted" = false'],
          });
        } else if (path === "phones") {
          clause = buildRelationStringClause({
            table: '"CrmPersonPhone"',
            alias: "ph",
            column: '"phone"',
            op,
            value: val,
          });
        } else if (path.startsWith("fields.")) {
          const fieldId = path.split(".")[1];
          clause = buildFieldClause(fieldId, op, val);
        }

        if (clause) {
          whereClauses.push(clause);
        }
      }
      tmark("Built SQL where clauses", {
        clauseCount: whereClauses.length,
      });

      const whereSql =
        whereClauses.length > 0
          ? `WHERE ${whereClauses.map((clause) => `(${clause})`).join(" AND ")}`
          : "";

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
      tmark("Counted crmPerson total", { total });

      const prismaSortable = new Set([
        "name",
        "createdAt",
        "updatedAt",
        "source",
      ]);

      const joinClauses = [
        `
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(li.amount), 0)::double precision AS value
          FROM "LedgerItem" li
          WHERE li."eventId" = ${eventParam}
            AND li."crmPersonId" = p.id
        ) lifetime ON true
      `,
      ];

      const orderExpressions = [];
      const orderDirection = order === "asc" ? "ASC" : "DESC";
      if (orderBy === "lifetimeValue") {
        orderExpressions.push(`COALESCE(lifetime.value, 0) ${orderDirection}`);
      } else if (orderBy && orderBy.startsWith("fields.")) {
        const fieldId = orderBy.split(".")[1];
        if (fieldId) {
          const fieldParam = addParam(fieldId);
          joinClauses.push(`
          LEFT JOIN "CrmPersonField" sortField
            ON sortField."crmPersonId" = p.id
           AND sortField."crmFieldId" = ${fieldParam}
        `);
          orderExpressions.push(
            `LOWER(COALESCE(sortField.value, '')) ${orderDirection} NULLS LAST`
          );
        }
      } else if (orderBy && prismaSortable.has(orderBy)) {
        orderExpressions.push(`p."${orderBy}" ${orderDirection}`);
      }

      if (!orderExpressions.length) {
        orderExpressions.push(`p."createdAt" DESC`);
      } else if (orderBy !== "createdAt") {
        orderExpressions.push(`p."createdAt" DESC`);
      }

      const orderSql = orderExpressions.join(", ");

      const offset = (page - 1) * size;
      const offsetParam = addParam(offset);
      const limitParam = addParam(offset + size);

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
          COALESCE(phoneAgg.data, '[]'::jsonb) AS phones,
          COALESCE(fieldAgg.data, '[]'::jsonb) AS "fieldValues"
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
        WHERE base.row_number > ${offsetParam}
          AND base.row_number <= ${limitParam}
        ORDER BY base.row_number
      `,
        ...params
      );
      tmark("Fetched crmPersons via raw SQL", {
        count: crmRows.length,
      });

      const lifetimeMap = new Map();
      const crmPersons = crmRows.map((row) => {
        const {
          row_number,
          lifetime_value,
          emails = [],
          phones = [],
          fieldValues = [],
          ...rest
        } = row;
        lifetimeMap.set(rest.id, Number(lifetime_value || 0));
        return {
          ...rest,
          emails: Array.isArray(emails) ? emails : [],
          phones: Array.isArray(phones) ? phones : [],
          fieldValues: Array.isArray(fieldValues) ? fieldValues : [],
        };
      });
      tmark("Normalized raw CRM rows", { count: crmPersons.length });

      const personIds = crmPersons.map((person) => person.id);
      tmark("Person IDs extracted", { personIds: personIds.length });

      let participantRegistrations = [];
      let volunteerRegistrations = [];
      let emailEntries = [];

      if (personIds.length) {
        const participantRegistrations = await prisma.$queryRawUnsafe(
          `
  SELECT
    r."id",
    r."crmPersonId",
    r."finalized",
    r."createdAt",

    json_build_object('id', i."id", 'name', i."name") AS instance,
    json_build_object('id', rt."id", 'name', rt."name") AS "registrationTier",
    json_build_object('id', rp."id", 'name', rp."name") AS "registrationPeriod",
    json_build_object('id', t."id", 'name', t."name") AS team,
    json_build_object('id', c."id", 'code', c."code", 'title', c."title") AS coupon,

    (
      SELECT json_agg(
        json_build_object(
          'quantity', u."quantity",
          'upsellItem', json_build_object('id', ui."id", 'name', ui."name")
        )
      )
      FROM "RegistrationUpsell" u
      LEFT JOIN "UpsellItem" ui ON ui."id" = u."upsellItemId"
      WHERE u."registrationId" = r."id"
    ) AS upsells,

    (
      SELECT json_agg(
        json_build_object(
          'fieldId', fr."fieldId",
          'value', fr."value",
          'option', json_build_object('label', o."label"),
          'field', json_build_object('id', f."id", 'label', f."label")
        )
      )
      FROM "RegistrationFieldResponse" fr
      LEFT JOIN "RegistrationFieldOption" o ON o."id" = fr."optionId"
      LEFT JOIN "RegistrationField" f ON f."id" = fr."fieldId"
      WHERE fr."registrationId" = r."id"
    ) AS "fieldResponses"

  FROM "Registration" r
  LEFT JOIN "EventInstance" i ON i."id" = r."instanceId"
  LEFT JOIN "RegistrationTier" rt ON rt."id" = r."registrationTierId"
  LEFT JOIN "RegistrationPricing" rp ON rp."id" = r."registrationPeriodId"
  LEFT JOIN "Team" t ON t."id" = r."teamId"
  LEFT JOIN "Coupon" c ON c."id" = r."couponId"
  WHERE
    r."eventId" = $1
    AND r."crmPersonId" = ANY($2)
    AND r."deleted" = false
  ORDER BY r."createdAt" DESC
  `,
          eventId,
          personIds
        );

        tmark("Fetched participantRegistrations", {
          participantRegistrations: participantRegistrations.length,
        });

        const volunteerRegistrations = await prisma.$queryRawUnsafe(
          `
  SELECT
    vr."id",
    vr."createdAt",
    json_build_object('id', i."id", 'name', i."name") AS instance,
    json_build_object('crmPersonId', cpl."crmPersonId") AS "crmPersonLink",

    (
      SELECT json_agg(
        json_build_object(
          'fieldId', fr."fieldId",
          'value', fr."value",
          'field', json_build_object('id', f."id", 'label', f."label")
        )
      )
      FROM "FieldResponse" fr
      LEFT JOIN "FormField" f ON f."id" = fr."fieldId"
      WHERE fr."responseId" = vr."id"
    ) AS "fieldResponses",

    (
      SELECT json_agg(
        json_build_object(
          'shift',
          json_build_object(
            'id', s."id",
            'job', json_build_object(
              'id', j."id",
              'name', j."name",
              'location', json_build_object('id', jl."id", 'name', jl."name")
            ),
            'location', json_build_object('id', sl."id", 'name', sl."name")
          )
        )
      )
      FROM "FormResponseShift" vs
      LEFT JOIN "Shift" s ON s."id" = vs."shiftId"
      LEFT JOIN "Job" j ON j."id" = s."jobId"
      LEFT JOIN "Location" jl ON jl."id" = j."locationId"
      LEFT JOIN "Location" sl ON sl."id" = s."locationId"
      WHERE vs."formResponseId" = vr."id"
    ) AS shifts

  FROM "FormResponse" vr
  LEFT JOIN "EventInstance" i ON i."id" = vr."instanceId"
  LEFT JOIN "CrmPersonLink" cpl ON cpl."formResponseId" = vr."id"
  WHERE
    vr."eventId" = $1
    AND vr."deleted" = false
    AND cpl."crmPersonId" = ANY($2)
  ORDER BY vr."createdAt" DESC
  `,
          eventId,
          personIds
        );

        tmark("Fetched volunteerRegistrations", {
          participantRegistrations: participantRegistrations.length,
          volunteerRegistrations: volunteerRegistrations.length,
        });

        const emailEntries = await prisma.$queryRawUnsafe(
          `
  SELECT DISTINCT ON ("crmPersonId")
    "crmPersonId", "createdAt"
  FROM "Email"
  WHERE "crmPersonId" = ANY($1::text[])
  ORDER BY "crmPersonId", "createdAt" DESC
`,
          personIds
        );

        tmark("Fetched emailEntries", {
          emails: emailEntries.length,
        });
      }

      const emailMap = new Map();
      for (const email of emailEntries) {
        const personId = email.crmPersonId;
        emailMap.set(personId, email.createdAt);
      }

      const ledgerMap = new Map(
        personIds.map((id) => [id, lifetimeMap.get(id) ?? 0])
      );
      if (personIds.length) {
        tmark("Used lifetime sums from raw query", {
          populated: ledgerMap.size,
        });
      } else {
        tmark("Empty ledger map (no persons)");
      }

      const participantAccumulator = new Map();
      for (const reg of participantRegistrations) {
        if (!reg.crmPersonId) continue;
        let summary = participantAccumulator.get(reg.crmPersonId);
        if (!summary) {
          summary = {
            total: 0,
            finalized: 0,
            latest: null,
            registrations: [],
            tiers: new Set(),
            periods: new Set(),
            teams: new Set(),
            coupons: new Set(),
            upsellTotals: new Map(),
            fieldValues: new Map(),
          };
          participantAccumulator.set(reg.crmPersonId, summary);
        }

        const detail = {
          id: reg.id,
          createdAt: reg.createdAt,
          instanceId: reg.instance?.id ?? null,
          instanceName: reg.instance?.name ?? null,
          finalized: reg.finalized,
          tierId: reg.registrationTier?.id ?? null,
          tierName: reg.registrationTier?.name ?? null,
          periodId: reg.registrationPeriod?.id ?? null,
          periodName: reg.registrationPeriod?.name ?? null,
          teamId: reg.team?.id ?? null,
          teamName: reg.team?.name ?? null,
          couponCode: reg.coupon?.code || reg.coupon?.title || null,
          upsells: [],
          fieldValues: formatFieldResponses(reg.fieldResponses),
        };

        if (Array.isArray(reg.upsells)) {
          for (const upsell of reg.upsells) {
            const name = upsell?.upsellItem?.name?.trim();
            if (!name) continue;
            const quantity = Number(upsell.quantity || 0) || 0;
            const label = quantity > 1 ? `${name} ×${quantity}` : name;
            detail.upsells.push(label);
            const current = summary.upsellTotals.get(name) || 0;
            summary.upsellTotals.set(name, current + (quantity || 1));
          }
        }

        summary.total += 1;
        if (reg.finalized) summary.finalized += 1;
        summary.registrations.push(detail);
        if (detail.tierName) summary.tiers.add(detail.tierName);
        if (detail.periodName) summary.periods.add(detail.periodName);
        if (detail.teamName) summary.teams.add(detail.teamName);
        if (detail.couponCode) summary.coupons.add(detail.couponCode);

        if (detail.fieldValues?.length) {
          for (const field of detail.fieldValues) {
            const label = field.label;
            const value = field.value;
            if (!label || !value) continue;
            const existing = summary.fieldValues.get(label) || new Set();
            existing.add(value);
            summary.fieldValues.set(label, existing);
          }
        }
        if (!summary.latest) summary.latest = detail;
      }
      tmark("Aggregated participant registrations", {
        personsWithParticipantRegs: participantAccumulator.size,
      });

      const normalizedParticipantMap = new Map(
        [...participantAccumulator.entries()].map(([personId, summary]) => [
          personId,
          {
            total: summary.total,
            finalized: summary.finalized,
            latest: summary.latest,
            registrations: summary.registrations,
            tiers: Array.from(summary.tiers).sort((a, b) => a.localeCompare(b)),
            periods: Array.from(summary.periods).sort((a, b) =>
              a.localeCompare(b)
            ),
            teams: Array.from(summary.teams).sort((a, b) => a.localeCompare(b)),
            coupons: Array.from(summary.coupons).sort((a, b) =>
              a.localeCompare(b)
            ),
            upsells: Array.from(summary.upsellTotals.entries())
              .map(([name, quantity]) =>
                quantity > 1 ? `${name} ×${quantity}` : name
              )
              .sort((a, b) => a.localeCompare(b)),
            fields: (() => {
              const output = {};
              for (const [label, values] of summary.fieldValues.entries()) {
                output[label] = Array.from(values).join(", ");
              }
              return output;
            })(),
          },
        ])
      );
      tmark("Normalized participant map", {
        normalizedCount: normalizedParticipantMap.size,
      });

      const volunteerAccumulator = new Map();
      for (const reg of volunteerRegistrations) {
        const personId = reg.crmPersonLink?.crmPersonId;
        if (!personId) continue;
        let summary = volunteerAccumulator.get(personId);
        if (!summary) {
          summary = {
            total: 0,
            totalShifts: 0,
            latest: null,
            registrations: [],
            jobNames: new Set(),
            locationNames: new Set(),
            fieldValues: new Map(),
          };
          volunteerAccumulator.set(personId, summary);
        }

        const jobNames = new Set();
        const locationNames = new Set();
        for (const signup of reg.shifts || []) {
          const shiftJob = signup.shift?.job;
          if (shiftJob?.name) jobNames.add(shiftJob.name);
          if (shiftJob?.location?.name)
            locationNames.add(shiftJob.location.name);
          if (signup.shift?.location?.name)
            locationNames.add(signup.shift.location.name);
        }

        const detail = {
          id: reg.id,
          createdAt: reg.createdAt,
          instanceId: reg.instance?.id ?? null,
          instanceName: reg.instance?.name ?? null,
          shiftCount: (reg.shifts || []).length,
          jobNames: Array.from(jobNames),
          locationNames: Array.from(locationNames),
          fieldValues: formatFieldResponses(reg.fieldResponses),
        };

        summary.total += 1;
        summary.totalShifts += detail.shiftCount;
        summary.registrations.push(detail);
        detail.jobNames.forEach((name) => summary.jobNames.add(name));
        detail.locationNames.forEach((name) => summary.locationNames.add(name));
        if (detail.fieldValues?.length) {
          for (const field of detail.fieldValues) {
            const label = field.label;
            const value = field.value;
            if (!label || !value) continue;
            const existing = summary.fieldValues.get(label) || new Set();
            existing.add(value);
            summary.fieldValues.set(label, existing);
          }
        }
        if (!summary.latest) summary.latest = detail;
      }
      tmark("Aggregated volunteer registrations", {
        personsWithVolunteerRegs: volunteerAccumulator.size,
      });

      const volunteerMap = new Map(
        [...volunteerAccumulator.entries()].map(([personId, summary]) => [
          personId,
          {
            total: summary.total,
            totalShifts: summary.totalShifts,
            latest: summary.latest,
            registrations: summary.registrations,
            jobs: Array.from(summary.jobNames).sort((a, b) =>
              a.localeCompare(b)
            ),
            locations: Array.from(summary.locationNames).sort((a, b) =>
              a.localeCompare(b)
            ),
            fields: (() => {
              const output = {};
              for (const [label, values] of summary.fieldValues.entries()) {
                output[label] = Array.from(values).join(", ");
              }
              return output;
            })(),
          },
        ])
      );
      tmark("Built volunteer map", { normalizedCount: volunteerMap.size });

      const enrichedCrmPersons = crmPersons.map((person) => {
        const participantStats = normalizedParticipantMap.get(person.id);
        const volunteerStats = volunteerMap.get(person.id);
        return {
          ...person,
          fields: collapseCrmValues(person.fieldValues),
          lifetimeValue: ledgerMap.get(person.id) ?? 0,
          lastEmailedAt: emailMap.get(person.id) ?? null,
          participantStats: participantStats || {
            total: 0,
            finalized: 0,
            latest: null,
            registrations: [],
            tiers: [],
            periods: [],
            teams: [],
            coupons: [],
            upsells: [],
            fields: {},
          },
          volunteerStats: volunteerStats || {
            total: 0,
            totalShifts: 0,
            latest: null,
            registrations: [],
            jobs: [],
            locations: [],
            fields: {},
          },
        };
      });
      tmark("Assembled enriched persons", {
        enriched: enrichedCrmPersons.length,
      });

      res.json({
        crmPersons: enrichedCrmPersons,
        total,
      });
      tmark("Response sent");
    } catch (error) {
      console.error("Error in GET /event/:eventId/crm:", error);
      tmark("Error path");
      reportApiError(error, req);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];

export const post = [
  verifyAuth(["manager"]),
  express.json({ limit: "10mb" }),
  async (req, res) => {
    const eventId = req.params.eventId;
    try {
      const payload = req.body;
      const isImport = Array.isArray(payload);
      const rawPersons = isImport ? payload : [payload];

      // validate & strip extra fields via zod
      const persons = rawPersons.map((entry) => {
        const result = personSchema.safeParse(entry);
        if (!result.success)
          throw { status: 400, message: serializeError(result) };
        return result.data;
      });

      const successes = [];
      const failures = [];
      let importEffort;
      if (isImport) {
        importEffort = await prisma.crmPersonsImport.create({
          data: {
            eventId,
            total: persons.length,
            logs: {
              create: {
                type: LogType.CRM_PERSONS_IMPORT_STARTED,
                userId: req.user.id,
                ip: req.ip || req.headers["x-forwarded-for"],
                data: null,
                eventId,
              },
            },
          },
        });
      }

      // first pass: try creating each person
      for (const p of persons) {
        try {
          const created = await prisma.crmPerson.create({
            data: {
              ...p,
              eventId,
              ...(isImport && { source: "IMPORT" }),
              emails: { create: p.emails },
              phones: { create: p.phones },
              fieldValues: {
                create: p.fields.map((f) => ({
                  crmFieldId: f.id,
                  value: f.value,
                })),
              },
              fields: undefined,
              importId: isImport ? importEffort.id : undefined,
              logs: {
                create: {
                  type: LogType.CRM_PERSON_CREATED,
                  userId: req.user.id,
                  ip: req.ip || req.headers["x-forwarded-for"],
                  data: p,
                  eventId,
                },
              },
            },
          });
          successes.push(created);
        } catch (error) {
          console.log(
            "Initial insert failed for person:",
            p,
            "\nError:",
            error
          );
          failures.push(p);
        }
      }

      // retry any failures once
      if (failures.length) {
        console.log(`Retrying ${failures.length} failed insert(s)...`);
        const retryFailures = [];
        for (const p of failures) {
          try {
            const created = await prisma.crmPerson.create({
              data: {
                ...p,
                eventId,
                ...(isImport && { source: "IMPORT" }),
                emails: { create: p.emails },
                phones: { create: p.phones },
                fieldValues: {
                  create: p.fields.map((f) => ({
                    crmFieldId: f.id,
                    value: f.value,
                  })),
                },
                importId: isImport ? importEffort.id : undefined,
                fields: undefined,
                logs: {
                  create: {
                    type: LogType.CRM_PERSON_CREATED,
                    userId: req.user.id,
                    ip: req.ip || req.headers["x-forwarded-for"],
                    data: p,
                    eventId,
                  },
                },
              },
            });
            console.log("Retry succeeded for person:", created);
            successes.push(created);
          } catch (error) {
            console.log("Retry failed for person:", p, "\nError:", error);
            retryFailures.push(p);
          }
        }
        if (retryFailures.length) {
          console.log("Final failures after retry:", retryFailures);
        }
      }

      if (isImport) {
        await prisma.crmPersonsImport.update({
          where: {
            id: importEffort.id,
          },
          data: {
            finished: true,
          },
        });

        await sendEmail({
          From: "EventPilot Support <EventPilot@geteventpilot.com>",
          To: req.user.email,
          Subject: "Import finished",
          HtmlBody: await render(
            ImportFinishedEmail.ImportFinishedEmail({ name: req.user.name })
          ),
          userId: req.user.id,
        });
      }

      return res.json(
        isImport ? { crmPersons: successes } : { crmPerson: successes[0] }
      );
    } catch (err) {
      if (err.status === 400) {
        return res.status(400).json({ message: err.message });
      }
      console.error("Error in POST /event/:eventId/crm:", err);
      reportApiError(err, req);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];

export const patch = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const { eventId } = req.params;

      const imports = await prisma.crmPersonsImport.findMany({
        where: {
          eventId,
          finished: false,
        },
        include: {
          _count: {
            select: {
              crmPersons: true,
            },
          },
        },
      });

      return res.json({ imports });
    } catch (e) {
      console.log(e);
      reportApiError(e, req);
      return res.status(500).json({ error: e.message });
    }
  },
];
