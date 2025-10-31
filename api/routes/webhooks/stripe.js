import express from "express";
import Stripe from "stripe";
import { prisma } from "#prisma";
import { LogType } from "@prisma/client";
import { finalizeRegistration } from "../../util/finalizeRegistration";
import { getCrmPersonByEmail } from "../../util/getCrmPersonByEmail";
import {
  createLedgerItemForRegistration,
  ensureLedgerItemForPointOfSale,
} from "../../util/ledger";
import { ensureCrmPersonForPaymentIntent } from "../../util/crmPersonFromPaymentIntent.js";
import { findCrmPersonByStoredPaymentMethod } from "../../util/paymentMethods.js";
import { reportApiError } from "#util/reportApiError.js";

const stripe = new Stripe(process.env.STRIPE_SK, {
  apiVersion: "2024-04-10",
});

const CARD_LOG_TYPES = [
  LogType.STRIPE_PAYMENT_METHOD_ATTACHED,
  LogType.STRIPE_PAYMENT_INTENT_SUCCEEDED,
];

const numberOrNull = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const extractCardMatchContext = (stripeObject) => {
  if (!stripeObject || stripeObject.object !== "payment_intent") return null;

  const paymentMethodId =
    typeof stripeObject.payment_method === "string"
      ? stripeObject.payment_method
      : typeof stripeObject?.charges?.data?.[0]?.payment_method === "string"
      ? stripeObject.charges.data[0].payment_method
      : null;

  const chargesArray = Array.isArray(stripeObject?.charges?.data)
    ? stripeObject.charges.data
    : [];

  const capturedCharge =
    chargesArray.find((charge) => charge?.captured) || chargesArray[0] || null;

  if (!capturedCharge) {
    return {
      paymentMethodId,
      chargeCaptured: false,
      fingerprint: null,
      brand: null,
      last4: null,
      expMonth: null,
      expYear: null,
      cardholderName: null,
      hasSearchableField: Boolean(paymentMethodId),
    };
  }

  const paymentDetails = capturedCharge?.payment_method_details || {};
  const cardDetails =
    paymentDetails?.card_present ||
    paymentDetails?.card ||
    capturedCharge?.payment_method_details?.card ||
    null;

  const fingerprint = cardDetails?.fingerprint || null;
  const brand = cardDetails?.brand || null;
  const last4 = cardDetails?.last4 || null;
  const expMonth =
    numberOrNull(cardDetails?.exp_month ?? cardDetails?.expMonth) ?? null;
  const expYear =
    numberOrNull(cardDetails?.exp_year ?? cardDetails?.expYear) ?? null;

  const cardholderName =
    cardDetails?.cardholder_name ||
    cardDetails?.cardholderName ||
    capturedCharge?.billing_details?.name ||
    null;

  const hasSearchableField = Boolean(
    paymentMethodId ||
      fingerprint ||
      (brand && last4 && expMonth != null && expYear != null)
  );

  return {
    paymentMethodId,
    fingerprint,
    brand,
    last4,
    expMonth,
    expYear,
    chargeCaptured: Boolean(capturedCharge?.captured),
    cardholderName,
    hasSearchableField,
  };
};

const buildJsonPathFilters = (paths, value) =>
  paths.map((path) => ({
    data: {
      path,
      equals: value,
    },
  }));

const findCrmPersonFromPayment = async ({
  eventId,
  paymentMethodId,
  fingerprint,
  brand,
  last4,
  expMonth,
  expYear,
  cardholderName,
}) => {
  if (!eventId) return null;

  const storedMatch = await findCrmPersonByStoredPaymentMethod({
    eventId,
    paymentMethodDetails: {
      stripePaymentMethodId: paymentMethodId,
      fingerprint,
      brand,
      last4,
      expMonth,
      expYear,
      nameOnCard: cardholderName,
    },
  });

  if (storedMatch?.crmPersonId) {
    return storedMatch;
  }

  const baseWhere = {
    eventId,
    crmPersonId: { not: null },
  };

  if (paymentMethodId) {
    const paymentMethodLog = await prisma.logs.findFirst({
      where: {
        ...baseWhere,
        type: LogType.STRIPE_PAYMENT_METHOD_ATTACHED,
        data: {
          path: ["id"],
          equals: paymentMethodId,
        },
      },
      orderBy: { createdAt: "desc" },
    });
    if (paymentMethodLog?.crmPersonId) {
      return {
        crmPersonId: paymentMethodLog.crmPersonId,
        matchType: "payment_method_id",
      };
    }

    const priorIntentLog = await prisma.logs.findFirst({
      where: {
        ...baseWhere,
        type: LogType.STRIPE_PAYMENT_INTENT_SUCCEEDED,
        data: {
          path: ["payment_method"],
          equals: paymentMethodId,
        },
      },
      orderBy: { createdAt: "desc" },
    });
    if (priorIntentLog?.crmPersonId) {
      return {
        crmPersonId: priorIntentLog.crmPersonId,
        matchType: "payment_method_id",
      };
    }
  }

  if (fingerprint) {
    const fingerprintPaths = [
      ["card_present", "fingerprint"],
      ["card", "fingerprint"],
      [
        "charges",
        "data",
        "0",
        "payment_method_details",
        "card_present",
        "fingerprint",
      ],
      [
        "charges",
        "data",
        "0",
        "payment_method_details",
        "card",
        "fingerprint",
      ],
    ];

    const fingerprintLog = await prisma.logs.findFirst({
      where: {
        ...baseWhere,
        type: { in: CARD_LOG_TYPES },
        OR: buildJsonPathFilters(fingerprintPaths, fingerprint),
      },
      orderBy: { createdAt: "desc" },
    });

    if (fingerprintLog?.crmPersonId) {
      return {
        crmPersonId: fingerprintLog.crmPersonId,
        matchType: "card_fingerprint",
      };
    }
  }

  if (
    brand &&
    last4 &&
    expMonth != null &&
    expYear != null
  ) {
    const brandPaths = [
      ["card_present", "brand"],
      ["card", "brand"],
      [
        "charges",
        "data",
        "0",
        "payment_method_details",
        "card_present",
        "brand",
      ],
      [
        "charges",
        "data",
        "0",
        "payment_method_details",
        "card",
        "brand",
      ],
    ];
    const last4Paths = [
      ["card_present", "last4"],
      ["card", "last4"],
      [
        "charges",
        "data",
        "0",
        "payment_method_details",
        "card_present",
        "last4",
      ],
      [
        "charges",
        "data",
        "0",
        "payment_method_details",
        "card",
        "last4",
      ],
    ];
    const expMonthPaths = [
      ["card_present", "exp_month"],
      ["card_present", "expMonth"],
      ["card", "exp_month"],
      ["card", "expMonth"],
      [
        "charges",
        "data",
        "0",
        "payment_method_details",
        "card_present",
        "exp_month",
      ],
      [
        "charges",
        "data",
        "0",
        "payment_method_details",
        "card_present",
        "expMonth",
      ],
      [
        "charges",
        "data",
        "0",
        "payment_method_details",
        "card",
        "exp_month",
      ],
      [
        "charges",
        "data",
        "0",
        "payment_method_details",
        "card",
        "expMonth",
      ],
    ];
    const expYearPaths = [
      ["card_present", "exp_year"],
      ["card_present", "expYear"],
      ["card", "exp_year"],
      ["card", "expYear"],
      [
        "charges",
        "data",
        "0",
        "payment_method_details",
        "card_present",
        "exp_year",
      ],
      [
        "charges",
        "data",
        "0",
        "payment_method_details",
        "card_present",
        "expYear",
      ],
      [
        "charges",
        "data",
        "0",
        "payment_method_details",
        "card",
        "exp_year",
      ],
      [
        "charges",
        "data",
        "0",
        "payment_method_details",
        "card",
        "expYear",
      ],
    ];

    const cardDetailsLog = await prisma.logs.findFirst({
      where: {
        ...baseWhere,
        type: { in: CARD_LOG_TYPES },
        AND: [
          { OR: buildJsonPathFilters(brandPaths, brand) },
          { OR: buildJsonPathFilters(last4Paths, last4) },
          { OR: buildJsonPathFilters(expMonthPaths, expMonth) },
          { OR: buildJsonPathFilters(expYearPaths, expYear) },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    if (cardDetailsLog?.crmPersonId) {
      return {
        crmPersonId: cardDetailsLog.crmPersonId,
        matchType: "card_brand_last4_exp",
      };
    }
  }

  return null;
};

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
    let cardMatchInfo = null;

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

    if (!crmPersonId && stripeObject?.object === "payment_intent" && eventId) {
      const cardContext = extractCardMatchContext(stripeObject);
      if (
        cardContext?.chargeCaptured &&
        cardContext.hasSearchableField
      ) {
        const matched = await findCrmPersonFromPayment({
          eventId,
          paymentMethodId: cardContext.paymentMethodId,
          fingerprint: cardContext.fingerprint,
          brand: cardContext.brand,
          last4: cardContext.last4,
          expMonth: cardContext.expMonth,
          expYear: cardContext.expYear,
          cardholderName: cardContext.cardholderName,
        });
        if (matched?.crmPersonId) {
          crmPersonId = matched.crmPersonId;
          cardMatchInfo = {
            attempted: true,
            matched: true,
            matchType: matched.matchType,
            context: cardContext,
          };
        } else {
          cardMatchInfo = {
            attempted: true,
            matched: false,
            context: cardContext,
          };
        }
      }
    }

    return { eventId, crmPersonId, cardMatchInfo };
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
          const affiliations = await resolveAffiliations(paymentIntent);
          const { eventId: piEventId, cardMatchInfo } = affiliations;
          let { crmPersonId: piCrmPersonId } = affiliations;
          await prisma.logs.create({
            data: {
              type: LogType.STRIPE_PAYMENT_INTENT_SUCCEEDED,
              data: paymentIntent,
              eventId: piEventId,
              crmPersonId: piCrmPersonId,
            },
          });

          if (cardMatchInfo?.attempted) {
            if (cardMatchInfo.matched && piCrmPersonId) {
              console.log(
                `[STRIPE][CRM] PaymentIntent ${paymentIntent.id} linked to CRM person ${piCrmPersonId} via ${cardMatchInfo.matchType}`
              );
            } else {
              console.warn(
                `[STRIPE][CRM] PaymentIntent ${paymentIntent.id} captured without CRM person match`,
                {
                  eventId: piEventId,
                  paymentMethodId:
                    cardMatchInfo?.context?.paymentMethodId || null,
                  fingerprint: cardMatchInfo?.context?.fingerprint || null,
                  brand: cardMatchInfo?.context?.brand || null,
                  last4: cardMatchInfo?.context?.last4 || null,
                  expMonth: cardMatchInfo?.context?.expMonth ?? null,
                  expYear: cardMatchInfo?.context?.expYear ?? null,
                  cardholderName:
                    cardMatchInfo?.context?.cardholderName || null,
                }
              );
            }
          }

          if (!piCrmPersonId && cardMatchInfo?.attempted && piEventId) {
            const eventRecord = await prisma.event.findUnique({
              where: { id: piEventId },
              select: { stripeConnectedAccountId: true },
            });

            const stripeAccountId =
              eventRecord?.stripeConnectedAccountId?.trim() || null;

            if (stripeAccountId) {
              try {
                const { crmPerson, created } =
                  await ensureCrmPersonForPaymentIntent({
                    paymentIntent,
                    eventId: piEventId,
                    stripeAccountId,
                  });

                if (crmPerson?.id) {
                  piCrmPersonId = crmPerson.id;
                  if (created) {
                    console.log(
                      `[STRIPE][CRM] Created CRM person ${crmPerson.id} for PaymentIntent ${paymentIntent.id}`
                    );
                  } else {
                    console.log(
                      `[STRIPE][CRM] Linked PaymentIntent ${paymentIntent.id} to CRM person ${crmPerson.id}`
                    );
                  }
                }
              } catch (creationError) {
                console.error(
                  `[STRIPE][CRM] Failed to ensure CRM person for PaymentIntent ${paymentIntent.id}`,
                  creationError
                );
              }
            } else {
              console.warn(
                `[STRIPE][CRM] Event ${piEventId} missing connected account; cannot ensure CRM person for PaymentIntent ${paymentIntent.id}`
              );
            }
          }

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
          } else if (scope === "EVENTPILOT:POINT_OF_SALE") {
            const eventId = metadata.eventId || piEventId;
            const instanceId = metadata.instanceId || null;
            const dayOfAccountId =
              typeof metadata.dayOfAccountId === "string"
                ? metadata.dayOfAccountId
                : null;

            if (!eventId || !instanceId) {
              console.warn(
                `[STRIPE] PaymentIntent ${paymentIntent.id} missing event or instance metadata; skipping POS ledger item`
              );
              break;
            }

            if (!piCrmPersonId) {
              console.warn(
                `[STRIPE] PaymentIntent ${paymentIntent.id} succeeded without a CRM person; skipping POS ledger item`
              );
              break;
            }

            const instance = await prisma.eventInstance.findFirst({
              where: { id: instanceId, eventId },
              select: { id: true },
            });

            if (!instance) {
              console.warn(
                `[STRIPE] PaymentIntent ${paymentIntent.id} references unknown instance ${instanceId}; skipping POS ledger item`
              );
              break;
            }

            const charge = paymentIntent?.charges?.data?.[0] ?? null;
            const originalAmount = paymentIntent.amount / 100;

            let netAmount = originalAmount;
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
                  netAmount = bt.net / 100;
                }
              }
            } catch (e) {
              console.warn(
                "[STRIPE] Failed to retrieve balance transaction for POS net amount; using gross",
                e
              );
            }

            await ensureLedgerItemForPointOfSale({
              eventId,
              instanceId: instance.id,
              crmPersonId: piCrmPersonId,
              amount: netAmount,
              stripe_paymentIntentId: paymentIntent.id,
              originalAmount,
              dayOfDashboardAccountId: dayOfAccountId,
            });
          } else {
            console.warn(
              `[STRIPE] PaymentIntent ${paymentIntent.id} succeeded with unsupported scope ${scope || "undefined"}`
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
