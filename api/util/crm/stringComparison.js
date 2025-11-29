export const buildStringComparison = (expr, op, rawValue, addParam) => {
  const value = rawValue == null ? "" : String(rawValue).trim();
  const normalizedExpr = `COALESCE(${expr}, '')`;
  const lowerExpr = `LOWER(${normalizedExpr})`;

  if (op === "exists") return `${normalizedExpr} <> ''`;
  if (op === "not-exists") return `${normalizedExpr} = ''`;
  if (!value) return null;

  const addStringParam = (val) => addParam(val);

  if (op === "eq") return `${lowerExpr} = LOWER(${addStringParam(value)})`;
  if (op === "neq")
    return `NOT (${lowerExpr} = LOWER(${addStringParam(value)}))`;
  if (op === "contains")
    return `${normalizedExpr} ILIKE ${addStringParam(`%${value}%`)}`;
  if (op === "not-contains")
    return `NOT (${normalizedExpr} ILIKE ${addStringParam(`%${value}%`)})`;
  if (op === "starts-with")
    return `${normalizedExpr} ILIKE ${addStringParam(`${value}%`)}`;
  if (op === "ends-with")
    return `${normalizedExpr} ILIKE ${addStringParam(`%${value}`)}`;

  return null;
};
