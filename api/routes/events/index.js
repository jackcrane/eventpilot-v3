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
    try {
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
    } catch (error) {
      console.error(error);
      res.status(500).json({ error });
    }
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

      if (!result.data.instance) {
        return res.status(400).json({ message: "Instance is required" });
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
          instances: {
            create: {
              name: result.data.instance?.name,
              startTime: result.data.instance?.startTime,
              endTime: result.data.instance?.endTime,
              startTimeTz: result.data.instance?.startTimeTz,
              endTimeTz: result.data.instance?.endTimeTz,
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
            type: LogType.STRIPE_SUBSCRIPTION_CREATED,
            userId: req.user.id,
            ip: req.ip || req.headers["x-forwarded-for"],
            data: subscription,
          },
          {
            type: LogType.INSTANCE_CREATED,
            userId: req.user.id,
            ip: req.ip || req.headers["x-forwarded-for"],
            data: event.instances[0],
            instanceId: event.instances[0].id,
            eventId: event.id,
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
