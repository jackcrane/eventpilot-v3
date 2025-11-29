const PRISMA_SORTABLE = new Set(["name", "createdAt", "updatedAt", "source"]);

export const buildOrderPlan = ({ orderBy, order, addParam, eventParam }) => {
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

  const expressions = [];
  const direction = order === "asc" ? "ASC" : "DESC";

  if (orderBy === "lifetimeValue") {
    expressions.push(`COALESCE(lifetime.value, 0) ${direction}`);
  } else if (orderBy && orderBy.startsWith("fields.")) {
    const fieldId = orderBy.split(".")[1];
    if (fieldId) {
      const fieldParam = addParam(fieldId);
      joinClauses.push(`
      LEFT JOIN "CrmPersonField" sortField
        ON sortField."crmPersonId" = p.id
       AND sortField."crmFieldId" = ${fieldParam}
    `);
      expressions.push(
        `LOWER(COALESCE(sortField.value, '')) ${direction} NULLS LAST`
      );
    }
  } else if (orderBy && PRISMA_SORTABLE.has(orderBy)) {
    expressions.push(`p."${orderBy}" ${direction}`);
  }

  if (!expressions.length) {
    expressions.push(`p."createdAt" DESC`);
  } else if (orderBy !== "createdAt") {
    expressions.push(`p."createdAt" DESC`);
  }

  return {
    joinClauses,
    orderSql: expressions.join(", "),
  };
};
