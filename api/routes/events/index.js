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
        orderBy: {
          updatedAt: "desc",
        },
      });

      events = events.map((event) => {
        const computed = event.useHostedEmail
          ? `prefix@${event.slug}.geteventpilot.com`
          : event.externalContactEmail;

        return {
          ...event,
          computedExternalContactEmail: computed,
          contactEmail: event.contactEmail || computed,
          externalContactEmail: event.externalContactEmail || computed,
        };
      });

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

      const { defaultPaymentMethodId, ...eventData } = result.data || {};

      event = await prisma.event.create({
        data: {
          ...eventData,
          externalContactEmail: result.data.externalContactEmail
            ? result.data.externalContactEmail
            : req.user.email,
          instance: undefined,
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
          configuration: {
            create: {},
          },
        },
      });

      const priceId = process.env.STRIPE_EVENT_SUBSCRIPTION_PRICE_ID;
      if (!priceId) {
        throw new Error(
          "Missing STRIPE_EVENT_SUBSCRIPTION_PRICE_ID in environment"
        );
      }

      subscription = await stripe.subscriptions.create({
        customer: req.user.stripe_customerId,
        items: [
          {
            price: priceId, // Events subscription price
          },
        ],
        // If provided, set a subscription-level default payment method
        ...(defaultPaymentMethodId
          ? { default_payment_method: defaultPaymentMethodId }
          : {}),
        metadata: {
          eventId: event.id,
        },
      });

      // Persist subscription id on the event for future management
      await prisma.event.update({
        where: { id: event.id },
        data: {
          stripe_subscriptionId: subscription.id,
          goodPaymentStanding: ["active", "trialing"].includes(
            subscription?.status || ""
          ),
        },
      });

      await prisma.logs.createMany({
        data: [
          {
            type: LogType.STRIPE_SUBSCRIPTION_CREATED,
            userId: req.user.id,
            ip: req.ip || req.headers["x-forwarded-for"],
            data: subscription,
            eventId: event.id,
          },
          // {
          //   type: LogType.INSTANCE_CREATED,
          //   userId: req.user.id,
          //   ip: req.ip || req.headers["x-forwarded-for"],
          //   data: event.instances[0],
          //   instanceId: event.instances[0].id,
          //   eventId: event.id,
          // },
        ],
      });

      res.json({
        event,
      });
    } catch (e) {
      console.log(e);

      // Best-effort cleanup if one side failed
      try {
        if (event?.id) {
          await prisma.event.delete({ where: { id: event.id } });
        }
      } catch {}
      try {
        if (subscription?.id) {
          await stripe.subscriptions.cancel(subscription.id);
        }
      } catch {}

      res.status(500).json({ message: "Error" });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(eventSchema));
  },
];
