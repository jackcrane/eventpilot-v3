import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { locationSchema as schema } from "..";
import { getChangedKeys } from "#getChangedKeys";
import { LogType } from "@prisma/client";

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const { eventId, locationId } = req.params;
    const shouldIncludeShifts = req.query.includeShifts === "true";
    try {
      const location = await prisma.location.findUnique({
        where: {
          id: locationId,
          deleted: false,
        },
        include: {
          jobs: {
            where: {
              deleted: false,
            },
            orderBy: {
              updatedAt: "asc",
            },
            include: {
              shifts: shouldIncludeShifts
                ? {
                    where: { deleted: false },
                    orderBy: { startTime: "asc" },
                  }
                : undefined,
              _count: {
                select: {
                  shifts: {
                    where: { deleted: false },
                  },
                },
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
      console.log(error);
      return res.status(500).json({ message: error.message });
    }
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { locationId } = req.params;

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

    const before = await prisma.location.findUnique({
      where: { id: locationId },
    });

    try {
      const location = await prisma.location.update({
        where: {
          id: locationId,
        },
        data: {
          ...result.data,
        },
      });

      const changedKeys = getChangedKeys(before, location);
      await prisma.logs.create({
        data: {
          type: LogType.LOCATION_MODIFIED,
          userId: req.user.id,
          ip: req.ip,
          eventId: req.params.eventId,
          locationId: locationId,
          data: changedKeys,
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
    const { locationId } = req.params;
    try {
      await prisma.location.update({
        where: {
          id: locationId,
        },
        data: { deleted: true },
      });

      await prisma.logs.create({
        data: {
          type: LogType.LOCATION_DELETED,
          userId: req.user.id,
          ip: req.ip,
          eventId: req.params.eventId,
          locationId: locationId,
        },
      });

      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },
];
