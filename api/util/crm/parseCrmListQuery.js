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

  return { page, size, order, orderBy, includeDeleted, q, filters };
};
