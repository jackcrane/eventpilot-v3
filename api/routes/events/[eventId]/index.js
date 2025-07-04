import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { z } from "zod";
import { serializeError } from "#serializeError";

export const eventSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  logoFileId: z.string(),
  slug: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug can only contain lowercase letters, numbers, and hyphens",
    }),
  defaultTz: z.string(),
  bannerFileId: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  primaryAddress: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  organization: z.string().optional().nullable(),
  facebook: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  twitter: z.string().optional().nullable(),
  youtube: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
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

    const result = eventSchema.safeParse(req.body);

    console.log(result);

    if (!result.success) {
      return res.status(400).json({ message: serializeError(result) });
    }

    await prisma.event.update({
      where: {
        id: req.params.eventId,
      },
      data: result.data,
    });

    res.json({
      event,
    });
  },
];

export const del = [
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

    await prisma.event.delete({
      where: {
        id: req.params.eventId,
      },
    });

    res.json({
      event,
    });
  },
];
