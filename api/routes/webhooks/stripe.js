import express from "express";
import { handleInvoicePaymentWebhook, handleSubscriptionWebhook } from "./fragments/stripeWebhookBilling.js";
import { handlePaymentIntentSucceededWebhook } from "./fragments/stripeWebhookPaymentIntent.js";
import { handlePaymentMethodAttachedWebhook } from "./fragments/stripeWebhookPaymentMethod.js";
import { resolveStripeAffiliations } from "./fragments/stripeWebhookAffiliations.js";
import { ensureStripeLog } from "./fragments/stripeWebhookLogs.js";
import { reportApiError } from "#util/reportApiError.js";

const STRIPE_WEBHOOK_RECEIVED = "STRIPE_WEBHOOK_RECEIVED";

const HANDLERS = {
  "customer.subscription.created": handleSubscriptionWebhook,
  "customer.subscription.updated": handleSubscriptionWebhook,
  "customer.subscription.deleted": handleSubscriptionWebhook,
  "invoice.payment_succeeded": async ({ stripeEvent }) =>
    handleInvoicePaymentWebhook({
      stripeEvent,
      goodPaymentStanding: true,
    }),
  "invoice.payment_failed": async ({ stripeEvent }) =>
    handleInvoicePaymentWebhook({
      stripeEvent,
      goodPaymentStanding: false,
    }),
  "payment_method.attached": handlePaymentMethodAttachedWebhook,
  "payment_intent.succeeded": handlePaymentIntentSucceededWebhook,
  "setup_intent.succeeded": async ({ stripeEvent }) => {
    const setupIntent = stripeEvent.data.object;
    console.log(`[STRIPE] SetupIntent ${setupIntent.id} succeeded`);
  },
};

export const post = [
  express.json({ type: "application/json" }),
  async (request, response) => {
    const stripeEvent = request.body;

    try {
      const affiliations = await resolveStripeAffiliations(
        stripeEvent.data?.object
      );

      if (!affiliations?.eventId) {
        console.warn(`[STRIPE] No event ID found for event ${stripeEvent.id}`);
        return response.status(200).send("No event ID found");
      }

      const webhookReceiptLog = await ensureStripeLog({
        type: STRIPE_WEBHOOK_RECEIVED,
        objectId: stripeEvent.id,
        data: stripeEvent,
        eventId: affiliations.eventId,
        crmPersonId: affiliations.crmPersonId ?? null,
      });

      const handler = HANDLERS[stripeEvent.type];

      if (!handler) {
        console.log(`[STRIPE] Unhandled event type ${stripeEvent.type}`);
        return response.json({ received: true });
      }

      await handler({
        stripeEvent,
        webhookReceiptLogId: webhookReceiptLog.id,
      });

      return response.json({ received: true });
    } catch (error) {
      console.error("[STRIPE] Webhook error:", error);
      reportApiError(error, request);
      return response.status(500).send("Webhook handler failed");
    }
  },
];
