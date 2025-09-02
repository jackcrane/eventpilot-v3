import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;
    const instanceId = req.instanceId;

    try {
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

      res.json({
        volunteerRegistrations,
        registrationsByDay,
      });
    } catch (error) {
      console.error("Error in GET /event/:eventId/registrations:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
