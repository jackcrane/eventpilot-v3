import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { z } from "zod";
import { serializeError } from "#serializeError";
import { locationSchema as schema } from "..";

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
          jobs: {
            orderBy: {
              updatedAt: "asc",
            },
            include: {
              _count: {
                select: { shifts: true },
              },
            },
          },
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

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, locationId } = req.params;

    try {
      req.body.startTime = new Date(req.body.startTime);
      req.body.endTime = new Date(req.body.endTime);
    } catch {
      return res.status(400).json({ message: "Invalid date" });
    }

    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    try {
      const location = await prisma.location.update({
        where: {
          id: locationId,
        },
        data: {
          ...result.data,
        },
      });

      return res.json({
        location,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: error.message });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, locationId } = req.params;
    try {
      await prisma.location.delete({
        where: {
          id: locationId,
        },
      });

      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
];
