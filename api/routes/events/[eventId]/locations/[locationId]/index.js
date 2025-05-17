import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const { eventId, locationId } = req.params;
    try {
      const location = await prisma.location.findUnique({
        where: {
          id: locationId,
        },
        include: {
          jobs: true,
          shifts: true,
        },
      });

      if (!location || location.eventId !== eventId) {
        return res.status(404).json({ message: "Location not found" });
      }

      return res.json({
        location,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
];
