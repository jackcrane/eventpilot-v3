import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { z } from "zod";
import { LogType } from "@prisma/client";
import { stripe } from "#stripe";

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

    const event = await prisma.event.create({
      data: {
        name: result.data.name,
        description: result.data.description,
        userId: req.user.id,
        logoFileId: result.data.logoFileId,
        slug: result.data.slug,
        logs: {
          create: {
            type: LogType.EVENT_CREATED,
            userId: req.user.id,
            ip: req.ip || req.headers["x-forwarded-for"],
            data: result.data,
          },
        },
      },
    });

    const subscription = await stripe.subscriptions.create({
      customer: req.user.stripe_customerId,
      items: [
        {
          price: "price_1RRbcBIZm3Kzv7N0hZUMowir",
          quantity: 0,
        },
        {
          price: "price_1RRbcBIZm3Kzv7N0SFA9BEG5",
        },
      ],
      metadata: {
        eventId: event.id,
      },
    });

    await prisma.logs.createMany([
      {
        type: LogType.EVENT_CREATED,
        userId: req.user.id,
        ip: req.ip || req.headers["x-forwarded-for"],
        data: event,
      },
      {
        type: LogType.STRIPE_SUBSCRIPTION_CREATED,
        userId: req.user.id,
        ip: req.ip || req.headers["x-forwarded-for"],
        data: subscription,
      },
    ]);

    res.json({
      event,
    });
  },
];
