import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";

export const get = [
  verifyAuth(["manager"]),
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

      res.json({
        volunteerRegistrations,
        registrationsByDay,
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
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
