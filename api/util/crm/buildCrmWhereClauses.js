import { buildStringComparison } from "./stringComparison.js";
import { buildDateComparison } from "./dateComparison.js";
import { buildRelationStringClause } from "./buildRelationStringClause.js";
import { buildFieldClause } from "./buildFieldClause.js";

const buildTextSearchClause = ({
  q,
  addParam,
  includeDeleted,
}) => {
  if (!q) return null;
  const pattern = addParam(`%${q}%`);
  const emailDeletedClause = includeDeleted ? "" : 'AND e."deleted" = false';
  return `(
    p.name ILIKE ${pattern}
    OR p.source ILIKE ${pattern}
    OR p."stripe_customerId" ILIKE ${pattern}
    OR EXISTS (
      SELECT 1
      FROM "CrmPersonEmail" e
      WHERE e."crmPersonId" = p.id
        ${emailDeletedClause}
        AND e.email ILIKE ${pattern}
    )
    OR EXISTS (
      SELECT 1
      FROM "CrmPersonPhone" ph
      WHERE ph."crmPersonId" = p.id
        AND ph.phone ILIKE ${pattern}
    )
    OR EXISTS (
      SELECT 1
      FROM "CrmPersonField" f
      WHERE f."crmPersonId" = p.id
        AND f.value ILIKE ${pattern}
    )
  )`;
};

export const buildCrmWhereClauses = ({
  includeDeleted,
  q,
  filters = [],
  addParam,
  eventParam,
}) => {
  const clauses = [`p."eventId" = ${eventParam}`];
  if (!includeDeleted) clauses.push(`p."deleted" = false`);

  const searchClause = buildTextSearchClause({
    q,
    addParam,
    includeDeleted,
  });
  if (searchClause) clauses.push(searchClause);

  for (const filter of filters) {
    if (!filter || !filter.path || !filter.operation) continue;
    const op = String(filter.operation);
    const path = String(filter.path);
    const val = filter.value == null ? null : String(filter.value);
    let clause = null;

    if (
      path === "name" ||
      path === "source" ||
      path === "stripe_customerId"
    ) {
      clause = buildStringComparison(`p."${path}"`, op, val, addParam);
    } else if (path === "createdAt" || path === "updatedAt") {
      clause = buildDateComparison(`p."${path}"`, op, val, addParam);
    } else if (path === "emails") {
      clause = buildRelationStringClause({
        table: '"CrmPersonEmail"',
        alias: "e",
        column: '"email"',
        op,
        value: val,
        extraConditions: includeDeleted ? [] : ['e."deleted" = false'],
        addParam,
      });
    } else if (path === "phones") {
      clause = buildRelationStringClause({
        table: '"CrmPersonPhone"',
        alias: "ph",
        column: '"phone"',
        op,
        value: val,
        addParam,
      });
    } else if (path.startsWith("fields.")) {
      const fieldId = path.split(".")[1];
      clause = buildFieldClause({
        fieldId,
        op,
        rawValue: val,
        addParam,
      });
    }

    if (clause) clauses.push(clause);
  }

  const whereSql =
    clauses.length > 0
      ? `WHERE ${clauses.map((clause) => `(${clause})`).join(" AND ")}`
      : "";

  return { whereSql };
};
