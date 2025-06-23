import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { z } from "zod";
import { serializeError } from "#serializeError";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  logoFileId: z.string().optional(),
  slug: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug can only contain lowercase letters, numbers, and hyphens",
    }),
});

export const get = [
  verifyAuth(["manager"], true),
  async (req, res) => {
    const event = await prisma.event.findFirst({
      where: {
        userId: req.user.id,
        OR: [{ slug: req.params.eventId }, { id: req.params.eventId }],
      },
      include: {
        logo: {
          select: {
            location: true,
          },
        },
        formFields: req.query.includeFields,
      },
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!req.user.id) {
      delete event.userId;
    }

    res.json({
      event,
    });
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const event = await prisma.event.findFirst({
      where: {
        id: req.params.eventId,
      },
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!req.user.id) {
      delete event.userId;
    }

    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    const { name, description, logoFileId, slug } = result.data;

    await prisma.event.update({
      where: {
        id: req.params.eventId,
      },
      data: {
        name,
        description,
        logoFileId,
        slug,
      },
    });

    res.json({
      event,
    });
  },
];
