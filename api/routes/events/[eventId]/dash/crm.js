import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { reportApiError } from "#util/reportApiError.js";

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
      reportApiError(error, req);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];

