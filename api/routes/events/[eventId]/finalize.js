import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { stripe } from "#stripe";
import { z } from "zod";
import { eventSchema } from "./index.js";
import { serializeError } from "#serializeError";
import { LogType } from "@prisma/client";
import { reportApiError } from "#util/reportApiError.js";

const finalizeSchema = eventSchema
  .omit({
    defaultPaymentMethodId: true,
    stripe_customerId: true,
    finalized: true,
  })
  .extend({
    defaultPaymentMethodId: z.string().min(1),
    stripe_customerId: z.string().optional().nullable(),
    finalized: z.literal(true).optional(),
  });

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const parse = finalizeSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ message: serializeError(parse) });
    }

    const {
      defaultPaymentMethodId,
      stripe_customerId,
      instance,
      ...eventData
    } = parse.data;

    let event = await prisma.event.findFirst({
      where: { id: req.params.eventId, userId: req.user.id },
      include: { instances: true },
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.stripe_subscriptionId) {
      return res
        .status(400)
        .json({ message: "Event is already finalized and subscribed." });
    }

    let subscription;
    let customerId;

    try {
      const normalizedEventData = {
        ...eventData,
        externalContactEmail: parse.data.externalContactEmail
          ? parse.data.externalContactEmail
          : req.user.email,
      };

      await prisma.event.update({
        where: { id: event.id },
        data: normalizedEventData,
      });

      if (instance) {
        const existingInstance = event.instances[0];
        if (existingInstance) {
          await prisma.eventInstance.update({
            where: { id: existingInstance.id },
            data: {
              name: instance.name,
              startTime: instance.startTime,
              endTime: instance.endTime,
              startTimeTz: instance.startTimeTz,
              endTimeTz: instance.endTimeTz,
            },
          });
        } else {
          await prisma.eventInstance.create({
            data: {
              name: instance.name,
              startTime: instance.startTime,
              endTime: instance.endTime,
              startTimeTz: instance.startTimeTz,
              endTimeTz: instance.endTimeTz,
              eventId: event.id,
            },
          });
        }
      }

      // Refresh event to get latest values (including potential instance update)
      event = await prisma.event.findUnique({
        where: { id: event.id },
      });

      customerId = event?.stripe_customerId || stripe_customerId || null;

      if (customerId) {
        try {
          const cust = await stripe.customers.retrieve(customerId);
          const deleted = typeof cust !== "string" && cust?.deleted;
          if (typeof cust === "string" || !cust || deleted) {
            customerId = null;
          }
        } catch (e) {
          customerId = null;
        }
      }

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: event?.contactEmail || req.user.email,
          name: event?.name,
          metadata: { eventId: event?.id },
        });
        customerId = customer.id;
      }

      if (customerId !== event.stripe_customerId) {
        await prisma.event.update({
          where: { id: event.id },
          data: { stripe_customerId: customerId },
        });
      }

      try {
        await stripe.customers.update(customerId, {
          name: event?.name,
          metadata: { eventId: event?.id },
        });
      } catch (e) {
        console.warn(
          "[STRIPE] Failed to update customer on finalize",
          e?.message || e
        );
      }

      try {
        const pm = await stripe.paymentMethods.retrieve(defaultPaymentMethodId);
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

      const priceId = process.env.STRIPE_EVENT_SUBSCRIPTION_PRICE_ID;
      if (!priceId) {
        throw new Error(
          "Missing STRIPE_EVENT_SUBSCRIPTION_PRICE_ID in environment"
        );
      }

      subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price: priceId,
          },
        ],
        default_payment_method: defaultPaymentMethodId,
        metadata: {
          eventId: event.id,
        },
      });

      await prisma.event.update({
        where: { id: event.id },
        data: {
          stripe_subscriptionId: subscription.id,
          finalized: true,
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
        ],
      });

      const updatedEvent = await prisma.event.findUnique({
        where: { id: event.id },
      });

      res.json({
        event: updatedEvent,
      });
    } catch (error) {
      if (subscription?.id) {
        try {
          await stripe.subscriptions.cancel(subscription.id);
        } catch (e) {
          void e;
        }
      }

      reportApiError(error, req);
      res.status(500).json({ message: "Unable to finalize event" });
    }
  },
];
