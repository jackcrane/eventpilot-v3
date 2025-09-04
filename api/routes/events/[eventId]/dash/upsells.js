import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;
    const instanceId = req.instanceId;
    try {
      const total = await prisma.registration.count({
        where: { eventId, instanceId, deleted: false, finalized: true },
      });

      // Count distinct registrations with at least one upsell
      const rows = await prisma.$queryRaw`
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT DISTINCT r."id" AS registrationId
          FROM "Registration" r
          JOIN "RegistrationUpsell" ru ON ru."registrationId" = r."id"
          WHERE r."eventId" = ${eventId}
            AND r."instanceId" = ${instanceId}
            AND r."deleted" = false
            AND r."finalized" = true
        ) t
      `;
      const withUpsells = Number(rows?.[0]?.count ?? 0);
      const percent = total > 0 ? (withUpsells / total) * 100 : null;

      // Previous-instance comparison (as-of matched relative day from start)
      const currentInstance = await prisma.eventInstance.findUnique({
        where: { id: instanceId, eventId },
      });

      let previous = null;
      if (currentInstance) {
        const previousInstance = await prisma.eventInstance.findFirst({
          where: {
            eventId,
            deleted: false,
            startTime: { lt: currentInstance.startTime },
          },
          orderBy: { startTime: "desc" },
        });

        if (previousInstance) {
          const prevEnd = previousInstance.endTime ?? null;
          const prevTotalRows = await prisma.$queryRaw`
            WITH params AS (
              SELECT
                date_trunc('day', timezone('America/Chicago', now())) AS today_ct,
                date_trunc('day', timezone('America/Chicago', ${currentInstance.startTime})) AS cur_start_ct,
                date_trunc('day', timezone('America/Chicago', ${previousInstance.startTime})) AS prev_start_ct,
                date_trunc('day', timezone('America/Chicago', ${prevEnd})) AS prev_end_ct
            ), cutoff AS (
              SELECT
                CASE
                  WHEN prev_end_ct IS NULL THEN prev_start_ct + (today_ct - cur_start_ct)
                  ELSE LEAST(prev_start_ct + (today_ct - cur_start_ct), prev_end_ct)
                END AS prev_cutoff
              FROM params
            )
            SELECT COUNT(*)::int AS count
            FROM "Registration", cutoff
            WHERE "eventId" = ${eventId}
              AND "instanceId" = ${previousInstance.id}
              AND "deleted" = false
              AND "finalized" = true
              AND date_trunc('day', timezone('America/Chicago', "createdAt")) <= (SELECT prev_cutoff FROM cutoff)
          `;

          // Distinct registrations that have at least one upsell as-of cutoff
          const prevWithRows = await prisma.$queryRaw`
            WITH params AS (
              SELECT
                date_trunc('day', timezone('America/Chicago', now())) AS today_ct,
                date_trunc('day', timezone('America/Chicago', ${currentInstance.startTime})) AS cur_start_ct,
                date_trunc('day', timezone('America/Chicago', ${previousInstance.startTime})) AS prev_start_ct,
                date_trunc('day', timezone('America/Chicago', ${prevEnd})) AS prev_end_ct
            ), cutoff AS (
              SELECT
                CASE
                  WHEN prev_end_ct IS NULL THEN prev_start_ct + (today_ct - cur_start_ct)
                  ELSE LEAST(prev_start_ct + (today_ct - cur_start_ct), prev_end_ct)
                END AS prev_cutoff
              FROM params
            )
            SELECT COUNT(*)::int AS count
            FROM (
              SELECT DISTINCT r."id" AS registrationId
              FROM "Registration" r
              JOIN "RegistrationUpsell" ru ON ru."registrationId" = r."id"
              WHERE r."eventId" = ${eventId}
                AND r."instanceId" = ${previousInstance.id}
                AND r."deleted" = false
                AND r."finalized" = true
                AND date_trunc('day', timezone('America/Chicago', r."createdAt")) <= (SELECT prev_cutoff FROM cutoff)
            ) t
          `;

          const prevTotal = Number(prevTotalRows?.[0]?.count ?? 0);
          const prevWith = Number(prevWithRows?.[0]?.count ?? 0);
          const prevPercent = prevTotal > 0 ? (prevWith / prevTotal) * 100 : null;
          previous = { total: prevTotal, withUpsells: prevWith, percent: prevPercent };
        }
      }

      res.json({ total, withUpsells, percent, previous });
    } catch (error) {
      console.error("Error in GET /events/:eventId/dash/upsells:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
