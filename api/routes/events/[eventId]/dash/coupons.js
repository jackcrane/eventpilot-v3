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
      res.json({ total, used, percent });
    } catch (error) {
      console.error("Error in GET /events/:eventId/dash/coupons:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
];

