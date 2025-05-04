import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { z } from "zod";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const campaigns = await prisma.campaign.findMany({
      where: {
        userId: req.user.id,
        eventId: req.params.eventId,
      },
    });

    res.json({
      campaigns,
    });
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const schema = z.object({
      name: z.string().min(2),
      description: z.string().min(10),
      slug: z
        .string()
        .min(3)
        .max(30)
        .regex(/^[a-z0-9-]+$/, {
          message:
            "Slug can only contain lowercase letters, numbers, and hyphens",
        }),
    });

    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    const event = await prisma.campaign.create({
      data: {
        name: result.data.name,
        description: result.data.description,
        slug: result.data.slug,
        userId: req.user.id,
        eventId: req.params.eventId,
      },
    });

    res.json({
      event,
    });
  },
];
