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
      const used = await prisma.registration.count({
        where: {
          eventId,
          instanceId,
          deleted: false,
          finalized: true,
          NOT: { couponId: null },
        },
      });
      const percent = total > 0 ? (used / total) * 100 : null;

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
          // Count previous totals as-of cutoff aligned to current progress
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

          const prevUsedRows = await prisma.$queryRaw`
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
              AND "couponId" IS NOT NULL
              AND date_trunc('day', timezone('America/Chicago', "createdAt")) <= (SELECT prev_cutoff FROM cutoff)
          `;

          const prevTotal = Number(prevTotalRows?.[0]?.count ?? 0);
          const prevUsed = Number(prevUsedRows?.[0]?.count ?? 0);
          const prevPercent = prevTotal > 0 ? (prevUsed / prevTotal) * 100 : null;
          previous = { total: prevTotal, used: prevUsed, percent: prevPercent };
        }
      }

      res.json({ total, used, percent, previous });
    } catch (error) {
      console.error("Error in GET /events/:eventId/dash/coupons:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
