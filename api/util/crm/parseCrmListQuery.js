const parseIncludeParam = (rawInclude) => {
  if (!rawInclude) return [];
  const values = Array.isArray(rawInclude)
    ? rawInclude
    : String(rawInclude)
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
  const normalized = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    normalized.push(trimmed);
  }
  return Array.from(new Set(normalized));
};

export const parseCrmListQuery = (req) => {
  const page = Math.max(parseInt(req.query.page ?? "1", 10), 1);
  const size = Math.min(Math.max(parseInt(req.query.size ?? "50", 10), 1), 200);
  const order =
    (req.query.order || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const orderBy =
    typeof req.query.orderBy === "string" ? req.query.orderBy : null;
  const includeDeleted = Boolean(req.query.includeDeleted);
  const q = (req.query.q || "").toString().trim();

  let filters = [];
  if (req.query.filters) {
    try {
      const parsed = JSON.parse(req.query.filters);
      if (Array.isArray(parsed)) filters = parsed;
    } catch (_) {
      void _;
      // ignore invalid filters payload
    }
  }

  const include = parseIncludeParam(req.query.include);

  return { page, size, order, orderBy, includeDeleted, q, filters, include };
};
