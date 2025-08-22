import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { getNextInstance } from "#util/getNextInstance";
import { z } from "zod";
import { serializeError } from "#serializeError";

export const instanceSchema = z.object({
  name: z.string().min(2).max(50),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  startTimeTz: z.string(),
  endTimeTz: z.string(),
});

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const now = new Date();

    const instances = await prisma.eventInstance.findMany({
      where: { eventId, deleted: false },
    });

    const nextInstance = await getNextInstance(eventId);

    const annotated = instances.map((i) => ({
      ...i,
      active:
        i.startTime.getTime() < now.getTime() &&
        i.endTime.getTime() > now.getTime(),
      isNext: nextInstance ? i.id === nextInstance.id : false,
    }));

    res.json({ instances: annotated });
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const parsed = instanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: serializeError(parsed) });
    }

    const instance = await prisma.eventInstance.create({
      data: { ...parsed.data, eventId },
    });

    res.json({ instance });
  },
];
