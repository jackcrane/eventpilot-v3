import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const eventId = req.params.eventId;
    try {
      const totalCrm = await prisma.crmPerson.count({
        where: { eventId, deleted: false },
      });
      res.json({ totalCrm });
    } catch (error) {
      console.error("Error in GET /events/:eventId/dash/crm:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];

