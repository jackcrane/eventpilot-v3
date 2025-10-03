import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { reportApiError } from "#util/reportApiError.js";

export const get = [
  verifyAuth(["manager", "dod:volunteer"]),
  async (req, res) => {
    const eventId = req.params.eventId;
    const instanceId = req.instanceId;

    try {
      // Resolve current and previous instances for comparison overlay
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

      const volunteerRegistrations = await prisma.volunteerRegistration.count({
        where: { eventId, instanceId, deleted: false },
      });

      // Buckets per calendar day in America/Chicago
      const rows = await prisma.$queryRaw`
        SELECT
          (date_trunc('day', "createdAt" AT TIME ZONE 'America/Chicago'))::date AS day,
          COUNT(*)::int AS count
        FROM "FormResponse"
        WHERE "eventId" = ${eventId}
          AND "instanceId" = ${instanceId}
          AND "deleted" = false
        GROUP BY 1
        ORDER BY 1
      `;

      // Normalize to { date: 'YYYY-MM-DD', count }
      const registrationsByDay = rows.map((r) => ({
        date: new Date(r.day),
        count: Number(r.count),
      }));

      // If a previous instance exists, compute comparable buckets for it
      let previousRegistrationsByDay = null;
      if (previousInstance) {
        const prevRows = await prisma.$queryRaw`
          SELECT
            (date_trunc('day', "createdAt" AT TIME ZONE 'America/Chicago'))::date AS day,
            COUNT(*)::int AS count
          FROM "FormResponse"
          WHERE "eventId" = ${eventId}
            AND "instanceId" = ${previousInstance.id}
            AND "deleted" = false
          GROUP BY 1
          ORDER BY 1
        `;

        previousRegistrationsByDay = prevRows.map((r) => ({
          date: new Date(r.day),
          count: Number(r.count),
        }));
      }

      // Compute trend against previous instance at the same relative day offset from start
      // Example: If today is N days from current start, compare current total vs
      // previous total as-of (previous start + N days), clamped to previous end.
      let trend = null;
      if (previousInstance) {
        const prevEnd = previousInstance.endTime ?? null;
        const prevAsOfRows = await prisma.$queryRaw`
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
          FROM "FormResponse", cutoff
          WHERE "eventId" = ${eventId}
            AND "instanceId" = ${previousInstance.id}
            AND "deleted" = false
            AND date_trunc('day', timezone('America/Chicago', "createdAt")) <= (SELECT prev_cutoff FROM cutoff)
        `;

        const previousAsOf = Number(prevAsOfRows?.[0]?.count ?? 0);
        const delta = Number(volunteerRegistrations) - previousAsOf;
        const percentChange =
          previousAsOf > 0 ? (delta / previousAsOf) * 100 : null;
        trend = {
          previousAsOf,
          delta,
          percentChange,
        };
      }

      res.json({
        volunteerRegistrations,
        registrationsByDay,
        trend,
        previous: previousInstance
          ? {
              instance: {
                id: previousInstance.id,
                name: previousInstance.name,
                startTime: previousInstance.startTime,
                startTimeTz: previousInstance.startTimeTz,
                endTime: previousInstance.endTime,
                endTimeTz: previousInstance.endTimeTz,
              },
              registrationsByDay: previousRegistrationsByDay,
            }
          : null,
      });
    } catch (error) {
      console.error("Error in GET /event/:eventId/registrations:", error);
      reportApiError(error, req);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
