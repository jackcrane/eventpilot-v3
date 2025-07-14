import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { LogType } from "@prisma/client";
import { stripe } from "#stripe";
import { eventSchema } from "./[eventId]";
import { zerialize } from "zodex";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    let events = await prisma.event.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        logo: {
          select: {
            location: true,
          },
        },
        banner: {
          select: {
            location: true,
          },
        },
      },
    });

    events = events.map((event) => ({
      ...event,
      computedExternalContactEmail: event.useHostedEmail
        ? `{prefix}@${event.slug}.geteventpilot.com`
        : event.externalContactEmail,
    }));

    res.json({
      events,
    });
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    let event;
    let subscription;
    try {
      const result = eventSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ message: serializeError(result) });
      }

      event = await prisma.event.create({
        data: {
          ...result.data,
          userId: req.user.id,
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

      subscription = await stripe.subscriptions.create({
        customer: req.user.stripe_customerId,
        items: [
          {
            price: "price_1RRbcBIZm3Kzv7N0SFA9BEG5", // Events
          },
        ],
        metadata: {
          eventId: event.id,
        },
      });

      await prisma.logs.createMany({
        data: [
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
        ],
      });

      res.json({
        event,
      });
    } catch (e) {
      console.log(e);

      await prisma.event.delete({
        where: {
          id: event.id,
        },
      });

      await stripe.subscriptions.del(subscription.id);

      res.status(500).json({ message: "Error" });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(eventSchema));
  },
];
