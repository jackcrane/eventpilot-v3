import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { z } from "zod";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const events = await prisma.event.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        logo: {
          select: {
            location: true,
          },
        },
      },
    });

    res.json({
      events,
    });
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const schema = z.object({
      name: z.string().min(2),
      description: z.string().min(10),
      logoFileId: z.string().optional(),
    });

    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    const event = await prisma.event.create({
      data: {
        name: result.data.name,
        description: result.data.description,
        userId: req.user.id,
        logoFileId: result.data.logoFileId,
      },
    });

    res.json({
      event,
    });
  },
];
