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
      res.json({ total, withUpsells, percent });
    } catch (error) {
      console.error("Error in GET /events/:eventId/dash/upsells:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];

