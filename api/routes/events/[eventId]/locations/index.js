import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { LogType } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().min(10).max(200),
  startTime: z.date(),
  startTimeTz: z.string(),
  endTime: z.date(),
  endTimeTz: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});
export { schema as locationSchema };

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const instanceId = req.instanceId;

    try {
      req.body.startTime = new Date(req.body.startTime);
      req.body.endTime = new Date(req.body.endTime);
    } catch {
      return res.status(400).json({ message: "Invalid date" });
    }

    const result = schema.safeParse(req.body);
    if (!result.success) {
      console.log(result.error.issues);
      return res.status(400).json({ message: result.error.issues });
    }
    const { name, description } = result.data;

    try {
      const location = await prisma.location.create({
        data: {
          name,
          description,
          eventId,
          instanceId,
          ...result.data,
        },
      });

      await prisma.logs.create({
        data: {
          type: LogType.LOCATION_CREATED,
          userId: req.user.id,
          ip: req.ip,
          eventId: req.params.eventId,
          instanceId,
          locationId: location.id,
          data: location,
        },
      });

      return res.status(201).json({ message: "Location created", location });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: error.message });
    }
  },
];

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const { eventId } = req.params;
    const instanceId = req.instanceId;

    const locations = await prisma.location.findMany({
      where: {
        eventId,
        deleted: false,
        instanceId,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    res.json({ locations });
  },
];
