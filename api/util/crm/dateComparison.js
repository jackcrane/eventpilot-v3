export const buildDateComparison = (expr, op, rawValue, addParam) => {
  if (op === "exists") return `${expr} IS NOT NULL`;
  if (op === "not-exists") return `${expr} IS NULL`;

  if (!rawValue) return null;
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return null;
  const param = addParam(date);

  if (op === "date-after" || op === "greater-than") return `${expr} > ${param}`;
  if (op === "date-before" || op === "less-than") return `${expr} < ${param}`;
  if (op === "greater-than-or-equal") return `${expr} >= ${param}`;
  if (op === "less-than-or-equal") return `${expr} <= ${param}`;
  if (op === "eq") return `${expr} = ${param}`;
  if (op === "neq") return `${expr} <> ${param}`;

  return null;
};
