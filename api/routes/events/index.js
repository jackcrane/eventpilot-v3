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

      const { defaultPaymentMethodId, stripe_customerId, ...eventData } =
        result.data || {};

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

      // Ensure an event-scoped Stripe customer exists (reuse provided customer if any)
      let customerId = stripe_customerId;
      if (customerId) {
        // Best-effort verification: ensure this customer belongs to the same user
        try {
          const cust = await stripe.customers.retrieve(customerId);
          if (
            !cust ||
            typeof cust === "string" ||
            (cust.metadata && cust.metadata.prospectUserId !== req.user.id)
          ) {
            // Fallback to creating a new customer if verification fails
            customerId = null;
          }
        } catch (_) {
          customerId = null;
        }
      }
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: event.contactEmail || req.user.email,
          name: event.name,
          metadata: { eventId: event.id },
        });
        customerId = customer.id;
      }
      await prisma.event.update({
        where: { id: event.id },
        data: { stripe_customerId: customerId },
      });

      const priceId = process.env.STRIPE_EVENT_SUBSCRIPTION_PRICE_ID;
      if (!priceId) {
        throw new Error(
          "Missing STRIPE_EVENT_SUBSCRIPTION_PRICE_ID in environment"
        );
      }

      // Ensure the provided default payment method is attached to the customer
      if (defaultPaymentMethodId) {
        try {
          const pm = await stripe.paymentMethods.retrieve(
            defaultPaymentMethodId
          );
          const pmCustomer =
            typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
          if (!pmCustomer) {
            await stripe.paymentMethods.attach(defaultPaymentMethodId, {
              customer: customerId,
            });
          } else if (pmCustomer !== customerId) {
            return res.status(400).json({
              message:
                "Payment method is not attached to the selected customer. Please add a new card in the wizard and try again.",
            });
          }
        } catch (e) {
          return res
            .status(400)
            .json({ message: e?.message || "Invalid payment method" });
        }
      }

      subscription = await stripe.subscriptions.create({
        customer: customerId,
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
