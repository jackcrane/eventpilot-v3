import { prisma } from "#prisma";

export const fetchLatestEmailEntries = async ({ personIds }) => {
  if (!personIds.length) return [];
  return prisma.$queryRawUnsafe(
    `
      SELECT DISTINCT ON ("crmPersonId")
        "crmPersonId", "createdAt"
      FROM "Email"
      WHERE "crmPersonId" = ANY($1::text[])
      ORDER BY "crmPersonId", "createdAt" DESC
    `,
    personIds
  );
};
