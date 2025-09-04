import { prisma } from "#prisma";
import { stripe } from "#stripe";
import { verifyAuth } from "#verifyAuth";
import { LogType } from "@prisma/client";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    let event = await prisma.event.findFirst({
      where: { id: req.params.eventId, userId: req.user.id },
    });
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Ensure event has a Stripe customer
    if (!event.stripe_customerId) {
      const customer = await stripe.customers.create({
        email: event.contactEmail || req.user.email,
        name: event.name,
        metadata: { eventId: event.id },
      });
      event = await prisma.event.update({
        where: { id: event.id },
        data: { stripe_customerId: customer.id },
      });

      await prisma.logs.create({
        data: {
          type: LogType.STRIPE_CUSTOMER_CREATED,
          eventId: event.id,
          userId: req.user.id,
          ip: req.ip,
          data: { id: customer.id },
        },
      });
    }

    const intent = await stripe.setupIntents.create({
      customer: event.stripe_customerId,
      automatic_payment_methods: { enabled: true },
      metadata: { eventId: event.id },
    });

    await prisma.logs.create({
      data: {
        type: LogType.STRIPE_SETUP_INTENT_CREATED,
        userId: req.user.id,
        ip: req.ip,
        eventId: event.id,
        data: { id: intent.id },
      },
    });

    const customerSession = await stripe.customerSessions.create({
      customer: event.stripe_customerId,
      components: {
        payment_element: {
          enabled: true,
          features: {
            payment_method_redisplay: "enabled",
            payment_method_save: "enabled",
            payment_method_save_usage: "on_session",
            payment_method_remove: "enabled",
          },
        },
      },
    });

    res.json({
      intent: {
        id: intent.id,
        status: intent.status,
        client_secret: intent.client_secret,
      },
      customer_session: {
        id: customerSession.id,
        client_secret: customerSession.client_secret,
      },
    });
  },
];

