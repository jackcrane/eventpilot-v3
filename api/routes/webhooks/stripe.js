import express from "express";
import Stripe from "stripe";
import { prisma } from "#prisma";
import { LogType } from "@prisma/client";
import { finalizeRegistration } from "../../util/finalizeRegistration";
import { createLedgerItemForRegistration } from "../../util/ledger";

const stripe = new Stripe(process.env.STRIPE_SK, {
  apiVersion: "2024-04-10",
});

export const post = [
  express.json({ type: "application/json" }),
  async (request, response) => {
    const event = request.body;

    await prisma.logs.create({
      data: {
        type: "STRIPE_WEBHOOK_RECEIVED",
        data: event,
        eventId: event.data?.object?.metadata?.eventId,
      },
    });

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const status = sub.status; // active | trialing | past_due | canceled | unpaid | incomplete

        // Prefer explicit linkage via metadata.eventId when present
        let evt = null;
        const eventId = sub.metadata?.eventId;
        if (eventId) {
          evt = await prisma.event.findFirst({ where: { id: eventId } });
        }
        if (!evt) {
          evt = await prisma.event.findFirst({
            where: { stripe_subscriptionId: sub.id },
          });
        }

        if (evt) {
          await prisma.event.update({
            where: { id: evt.id },
            data: {
              stripe_subscriptionId: sub.id,
              goodPaymentStanding: ["active", "trialing"].includes(status || ""),
            },
          });
        }

        break;
      }

      case "invoice.payment_succeeded": {
        const inv = event.data.object;
        const subscriptionId = inv.subscription;
        if (typeof subscriptionId === "string") {
          const evt = await prisma.event.findFirst({
            where: { stripe_subscriptionId: subscriptionId },
          });
          if (evt) {
            await prisma.event.update({
              where: { id: evt.id },
              data: { goodPaymentStanding: true },
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object;
        const subscriptionId = inv.subscription;
        if (typeof subscriptionId === "string") {
          const evt = await prisma.event.findFirst({
            where: { stripe_subscriptionId: subscriptionId },
          });
          if (evt) {
            await prisma.event.update({
              where: { id: evt.id },
              data: { goodPaymentStanding: false },
            });
          }
        }
        break;
      }
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

        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object;
          const metadata = paymentIntent.metadata;
          const { scope } = metadata;

          await prisma.logs.create({
            data: {
              type: LogType.STRIPE_PAYMENT_INTENT_SUCCEEDED,
              data: paymentIntent,
            },
          });

          if (scope === "EVENTPILOT:REGISTRATION") {
            const { eventId, registrationId, instanceId } = metadata;
            const receiptUrl = paymentIntent.charges.data[0].receipt_url;

            const instance = await prisma.eventInstance.findUnique({
              where: {
                eventId,
                id: instanceId,
              },
            });
            await createLedgerItemForRegistration({
              eventId,
              instanceId: instance.id,
              registrationId,
              amount: paymentIntent.amount / 100,
              stripe_paymentIntentId: paymentIntent.id,
            });

            await finalizeRegistration({
              registrationId,
              eventId,
              receiptUrl,
              paymentIntent,
            });
          } else {
            console.warn(
              `[STRIPE] PaymentIntent ${paymentIntent.id} succeeded but scope is not EVENTPILOT:REGISTRATION`
            );
            break;
          }

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

// payment_intent.succeeded, charge.succeeded, charge.updated
