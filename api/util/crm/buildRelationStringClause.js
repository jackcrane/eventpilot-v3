import { buildStringComparison } from "./stringComparison.js";

export const buildRelationStringClause = ({
  table,
  alias,
  column,
  op,
  value,
  extraConditions = [],
  addParam,
}) => {
  const base = [`${alias}."crmPersonId" = p.id`, ...extraConditions];

  if (op === "exists") {
    return `EXISTS (SELECT 1 FROM ${table} ${alias} WHERE ${base.join(
      " AND "
    )})`;
  }

  if (op === "not-exists") {
    return `NOT EXISTS (SELECT 1 FROM ${table} ${alias} WHERE ${base.join(
      " AND "
    )})`;
  }

  const comparison = buildStringComparison(
    `${alias}.${column}`,
    op,
    value,
    addParam
  );
  if (!comparison) return null;

  return `EXISTS (SELECT 1 FROM ${table} ${alias} WHERE ${base.join(
    " AND "
  )} AND ${comparison})`;
};
