import { prisma } from "#prisma";
import { stripe } from "#stripe";
import { verifyAuth } from "#verifyAuth";
import { LogType } from "@prisma/client";

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const user = await prisma.user.findFirst({
      where: {
        id: req.user.id,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const intent = await stripe.setupIntents.create({
      customer: user.stripe_customerId,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    await prisma.logs.create({
      data: {
        type: LogType.STRIPE_SETUP_INTENT_CREATED,
        userId: user.id,
        ip: req.ip,
        data: intent,
      },
    });

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        stripe_setupIntentId: intent.id,
      },
    });

    const customerSession = await stripe.customerSessions.create({
      customer: user.stripe_customerId,
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
