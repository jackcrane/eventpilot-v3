import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;
    const instanceId = req.instanceId;

    try {
      const currentInstance = await prisma.eventInstance.findUnique({
        where: { id: instanceId, eventId },
      });

      let previousInstance = null;
      if (currentInstance) {
        previousInstance = await prisma.eventInstance.findFirst({
          where: {
            eventId,
            deleted: false,
            startTime: { lt: currentInstance.startTime },
          },
          orderBy: { startTime: "desc" },
        });
      }

      const totalOnTeams = await prisma.registration.count({
        where: {
          eventId,
          instanceId,
          deleted: false,
          finalized: true,
          NOT: { teamId: null },
        },
      });

      let trend = null;
      if (previousInstance) {
        const prevEnd = previousInstance.endTime ?? null;
        const rows = await prisma.$queryRaw`
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
            AND "teamId" IS NOT NULL
            AND date_trunc('day', timezone('America/Chicago', "createdAt")) <= (SELECT prev_cutoff FROM cutoff)
        `;

        const previousAsOf = Number(rows?.[0]?.count ?? 0);
        const delta = Number(totalOnTeams) - previousAsOf;
        const percentChange = previousAsOf > 0 ? (delta / previousAsOf) * 100 : null;
        trend = { previousAsOf, delta, percentChange };
      }

      res.json({ totalOnTeams, trend });
    } catch (error) {
      console.error("Error in GET /events/:eventId/dash/team-joins:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];

