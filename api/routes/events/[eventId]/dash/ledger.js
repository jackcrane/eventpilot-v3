import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;
    const instanceId = req.instanceId;

    try {
      // Resolve current and previous instances for comparison
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

      // Sum of ledger amounts for current instance
      const sumAgg = await prisma.ledgerItem.aggregate({
        where: { eventId, instanceId },
        _sum: { amount: true },
      });
      const ledgerTotal = Number(sumAgg?._sum?.amount ?? 0);

      // Compute trend against previous instance as-of aligned day offset from current start
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
          SELECT COALESCE(SUM("amount"), 0)::float AS total
          FROM "LedgerItem", cutoff
          WHERE "eventId" = ${eventId}
            AND "instanceId" = ${previousInstance.id}
            AND date_trunc('day', timezone('America/Chicago', "createdAt")) <= (SELECT prev_cutoff FROM cutoff)
        `;

        const previousAsOf = Number(rows?.[0]?.total ?? 0);
        const delta = Number(ledgerTotal) - previousAsOf;
        const percentChange =
          previousAsOf > 0 ? (delta / previousAsOf) * 100 : null;
        trend = { previousAsOf, delta, percentChange };
      }

      res.json({ ledgerTotal, trend });
    } catch (error) {
      console.error("Error in GET /events/:eventId/dash/ledger:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
