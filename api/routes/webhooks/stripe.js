import express from "express";
import Stripe from "stripe";
import { prisma } from "#prisma";
import { LogType } from "@prisma/client";
import { finalizeRegistration } from "../../util/finalizeRegistration";
import { getCrmPersonByEmail } from "../../util/getCrmPersonByEmail";
import { createLedgerItemForRegistration } from "../../util/ledger";

const stripe = new Stripe(process.env.STRIPE_SK, {
  apiVersion: "2024-04-10",
});

// Best-effort affiliation of Stripe objects to Event and CRM Person
const resolveAffiliations = async (stripeObject) => {
  try {
    // 1) Event resolution
    let eventId = stripeObject?.metadata?.eventId || null;

    if (!eventId) {
      // Try via subscription linkage
      const subId =
        typeof stripeObject?.subscription === "string"
          ? stripeObject.subscription
          : null;
      if (subId) {
        const evt = await prisma.event.findFirst({
          where: { stripe_subscriptionId: subId },
          select: { id: true },
        });
        eventId = evt?.id || null;
      }
    }

    if (!eventId) {
      // Try via customer linkage
      const customerId =
        typeof stripeObject?.customer === "string"
          ? stripeObject.customer
          : null;
      if (customerId) {
        const evt = await prisma.event.findFirst({
          where: { stripe_customerId: customerId },
          select: { id: true },
        });
        eventId = evt?.id || null;
      }
    }

    // 2) CRM person resolution
    // Prefer explicit metadata assignment
    let crmPersonId = stripeObject?.metadata?.crmPersonId || null;

    if (!crmPersonId) {
      // Lookup via Stripe customer ID on the person
      const customerId =
        typeof stripeObject?.customer === "string"
          ? stripeObject.customer
          : null;
      if (customerId) {
        const person = await prisma.crmPerson.findFirst({
          where: { stripe_customerId: customerId },
          select: { id: true },
        });
        crmPersonId = person?.id || null;
      }
    }

    if (!crmPersonId && eventId) {
      // Fallback: attempt by email when available
      // PaymentIntent: charges[0].billing_details.email
      const chargeEmail =
        stripeObject?.charges?.data?.[0]?.billing_details?.email || null;
      // PaymentMethod: billing_details.email
      const pmEmail = stripeObject?.billing_details?.email || null;
      const email = chargeEmail || pmEmail || null;
      if (email) {
        const person = await getCrmPersonByEmail(email, eventId);
        crmPersonId = person?.id || null;
      }
    }

    return { eventId, crmPersonId };
  } catch (e) {
    console.warn("[STRIPE] resolveAffiliations error", e);
    return { eventId: null, crmPersonId: null };
  }
};

export const post = [
  express.json({ type: "application/json" }),
  async (request, response) => {
    const event = request.body;

    // Attach event/person when possible for the raw receipt log
    const baseAffiliation = await resolveAffiliations(event.data?.object);

    if (!baseAffiliation?.eventId) {
      console.warn(`[STRIPE] No event ID found for event ${event.id}`);
      return response.status(200).send("No event ID found");
    }

    await prisma.logs.create({
      data: {
        type: "STRIPE_WEBHOOK_RECEIVED",
        data: event,
        eventId: baseAffiliation.eventId,
        crmPersonId: baseAffiliation.crmPersonId,
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
                goodPaymentStanding: ["active", "trialing"].includes(
                  status || ""
                ),
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

          if (!customerId) {
            console.warn("[STRIPE] Attached payment method has no customer ID");
            break;
          }

          const evt = await prisma.event.findFirst({
            where: { stripe_customerId: customerId },
          });

          await stripe.customers.update(customerId, {
            invoice_settings: {
              default_payment_method: paymentMethod.id,
            },
          });

          // Try to affiliate the log with a CRM person
          const { crmPersonId } = await resolveAffiliations(paymentMethod);
          await prisma.logs.create({
            data: {
              eventId: evt?.id,
              crmPersonId,
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
          // No user-level updates needed; event-level billing uses subscriptions
          break;
        }

        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object;
          const metadata = paymentIntent.metadata;
          const { scope } = metadata;

          // Attach event/person when possible for the PI succeeded log
          const { eventId: piEventId, crmPersonId: piCrmPersonId } =
            await resolveAffiliations(paymentIntent);
          await prisma.logs.create({
            data: {
              type: LogType.STRIPE_PAYMENT_INTENT_SUCCEEDED,
              data: paymentIntent,
              eventId: piEventId,
              crmPersonId: piCrmPersonId,
            },
          });

          if (scope === "EVENTPILOT:REGISTRATION") {
            const { eventId, registrationId, instanceId } = metadata;
            const charge = paymentIntent.charges.data[0];
            const receiptUrl = charge?.receipt_url;

            // Determine net amount credited to the connected account (exclude Stripe fees)
            let netAmount = paymentIntent.amount / 100;
            try {
              const eventRecord = await prisma.event.findUnique({
                where: { id: eventId },
              });
              const connectedAccount =
                eventRecord?.stripeConnectedAccountId || undefined;
              const balanceTxId = charge?.balance_transaction;
              if (balanceTxId && connectedAccount) {
                const bt = await stripe.balanceTransactions.retrieve(
                  balanceTxId,
                  {
                    stripeAccount: connectedAccount,
                  }
                );
                if (bt && typeof bt.net === "number") {
                  netAmount = bt.net / 100; // cents to dollars
                }
              }
            } catch (e) {
              // Fallback: Try metadata baseTotal if present; otherwise use gross
              const baseMeta = parseFloat(paymentIntent.metadata?.baseTotal);
              if (!Number.isNaN(baseMeta) && baseMeta >= 0) {
                netAmount = baseMeta;
              } else {
                console.warn(
                  "[STRIPE] Failed to retrieve balance transaction for net amount; falling back to gross",
                  e
                );
              }
            }

            const instance = await prisma.eventInstance.findUnique({
              where: {
                eventId,
                id: instanceId,
              },
            });
            const { crmPersonId } = await finalizeRegistration({
              registrationId,
              eventId,
              receiptUrl,
              paymentIntent,
              instanceId,
            });

            await createLedgerItemForRegistration({
              eventId,
              instanceId: instance.id,
              registrationId,
              amount: netAmount,
              stripe_paymentIntentId: paymentIntent.id,
              crmPersonId,
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
      reportApiError(error, request);
      response.status(500).send("Webhook handler failed");
    }
  },
];

// payment_intent.succeeded, charge.succeeded, charge.updated
