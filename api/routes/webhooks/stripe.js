import express from "express";
import Stripe from "stripe";
import { prisma } from "#prisma";
import { LogType } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SK, {
  apiVersion: "2024-04-10",
});

export const post = [
  express.json({ type: "application/json" }),
  async (request, response) => {
    const event = request.body;

    try {
      switch (event.type) {
        case "payment_method.attached": {
          const paymentMethod = event.data.object;
          const customerId = paymentMethod.customer;

          const user = await prisma.user.findFirst({
            where: {
              stripe_customerId: customerId,
            },
          });

          if (!customerId) {
            console.warn("[STRIPE] Attached payment method has no customer ID");
            break;
          }

          if (!user) {
            console.warn(
              `[STRIPE] Attached payment method has customer ID ${customerId} but no user found`
            );
            break;
          }

          await stripe.customers.update(customerId, {
            invoice_settings: {
              default_payment_method: paymentMethod.id,
            },
          });

          await prisma.logs.create({
            data: {
              userId: user.id,
              type: LogType.STRIPE_PAYMENT_METHOD_ATTACHED,
              data: paymentMethod,
            },
          });

          console.log(
            `[STRIPE] PaymentMethod ${paymentMethod.id} set as default for customer ${customerId}`
          );
          break;
        }

        case "setup_intent.succeeded": {
          const setupIntent = event.data.object;
          console.log(`[STRIPE] SetupIntent ${setupIntent.id} succeeded`);

          const user = await prisma.user.findFirst({
            where: {
              stripe_customerId: setupIntent.customer,
            },
          });

          if (!user) {
            console.warn(
              `[STRIPE] SetupIntent ${setupIntent.id} succeeded but no user found`
            );
            break;
          }

          await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              stripe_setupIntentId: null,
              goodPaymentStanding: true,
            },
          });

          await prisma.logs.create({
            data: {
              userId: user.id,
              type: LogType.STRIPE_SETUP_INTENT_SUCCEEDED,
              data: setupIntent,
            },
          });

          break;
        }

        default:
          console.log(`[STRIPE] Unhandled event type ${event.type}`);
      }

      response.json({ received: true });
    } catch (error) {
      console.error("[STRIPE] Webhook error:", error);
      response.status(500).send("Webhook handler failed");
    }
  },
];
