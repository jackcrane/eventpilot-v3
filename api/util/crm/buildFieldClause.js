import { buildStringComparison } from "./stringComparison.js";

export const buildFieldClause = ({ fieldId, op, rawValue, addParam }) => {
  if (!fieldId) return null;
  const fieldParam = addParam(fieldId);
  const base = `f."crmPersonId" = p.id AND f."crmFieldId" = ${fieldParam}`;

  if (op === "exists") {
    return `EXISTS (SELECT 1 FROM "CrmPersonField" f WHERE ${base})`;
  }

  if (op === "not-exists") {
    return `NOT EXISTS (SELECT 1 FROM "CrmPersonField" f WHERE ${base})`;
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
    const comparison = buildStringComparison("f.value", op, rawValue, addParam);
    if (!comparison) return null;
    return `EXISTS (SELECT 1 FROM "CrmPersonField" f WHERE ${base} AND ${comparison})`;
  }

  if (
    [
      "greater-than",
      "greater-than-or-equal",
      "less-than",
      "less-than-or-equal",
    ].includes(op)
  ) {
    const numeric = Number(rawValue);
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
      WHERE ${base}
        AND CASE
              WHEN f.value ~ '^-?[0-9]+(\\.[0-9]+)?$'
              THEN (f.value)::double precision
              ELSE NULL
            END ${comparator} ${numericParam}
    )`;
  }

  if (op === "date-after" || op === "date-before") {
    const date = rawValue ? new Date(rawValue) : null;
    if (!date || Number.isNaN(date.getTime())) return null;
    const comparator = op === "date-after" ? ">" : "<";
    const dateParam = addParam(date);
    return `EXISTS (
      SELECT 1
      FROM "CrmPersonField" f
      WHERE ${base}
        AND NULLIF(f.value, '')::timestamptz ${comparator} ${dateParam}
    )`;
  }

  return null;
};
