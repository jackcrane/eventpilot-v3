import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;
    const instanceId = req.instanceId;

    try {
      const registrations = await prisma.registration.count({
        where: { eventId, instanceId, deleted: false },
      });

      res.json({ registrations });
    } catch (error) {
      console.error("Error in GET /event/:eventId/registrations:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];
