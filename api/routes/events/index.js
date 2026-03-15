import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { LogType } from "@prisma/client";
import { stripe, isStripeMock } from "#stripe";
import { eventSchema } from "./[eventId]";
import { zerialize } from "zodex";
import { reportApiError } from "#util/reportApiError.js";
import { e2eLog } from "#util/log.js";
import { captureApiEvent, identifyApiGroup } from "#util/posthog.js";

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
      reportApiError(error, req);
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
      e2eLog("POST /api/events started", {
        requestId: req.id,
        userId: req.user?.id,
        finalized: req.body?.finalized,
        hasInstance: Boolean(req.body?.instance),
      });

      const result = eventSchema.safeParse(req.body);

      if (!result.success) {
        e2eLog("POST /api/events validation failed", {
          requestId: req.id,
          userId: req.user?.id,
          issues: result.error?.issues,
        });
        return res.status(400).json({ message: serializeError(result) });
      }

      if (!result.data.instance) {
        e2eLog("POST /api/events missing required instance", {
          requestId: req.id,
          userId: req.user?.id,
        });
        return res.status(400).json({ message: "Instance is required" });
      }

      const {
        defaultPaymentMethodId,
        stripe_customerId,
        finalized: finalizedInput,
        instance,
        ...eventData
      } = result.data || {};

      const shouldFinalize = finalizedInput !== false;
      const finalized = finalizedInput === false ? false : true;

      event = await prisma.event.create({
        data: {
          ...eventData,
          finalized,
          externalContactEmail: result.data.externalContactEmail
            ? result.data.externalContactEmail
            : req.user.email,
          userId: req.user.id,
          logs: {
            create: {
              type: LogType.EVENT_CREATED,
              userId: req.user.id,
              ip: req.ip || req.headers["x-forwarded-for"],
              data: result.data,
            },
          },
          ...(instance
            ? {
                instances: {
                  create: {
                    name: instance?.name,
                    startTime: instance?.startTime,
                    endTime: instance?.endTime,
                    startTimeTz: instance?.startTimeTz,
                    endTimeTz: instance?.endTimeTz,
                  },
                },
              }
            : {}),
          configuration: {
            create: {},
          },
        },
      });

      e2eLog("POST /api/events draft created", {
        requestId: req.id,
        userId: req.user?.id,
        eventId: event?.id,
        shouldFinalize,
        isStripeMock,
      });

      if (!shouldFinalize) {
        e2eLog("POST /api/events returning draft (finalize skipped)", {
          requestId: req.id,
          userId: req.user?.id,
          eventId: event?.id,
        });
        await identifyApiGroup(req, {
          eventId: event.id,
          eventProperties: {
            event_name: event.name,
            event_slug: event.slug,
            finalized: false,
          },
        });
        await captureApiEvent(
          req,
          "api_event_created",
          {
            event_id: event.id,
            event_name: event.name,
            event_slug: event.slug,
            finalized: false,
            instance_count: instance ? 1 : 0,
          },
          { eventId: event.id, identifyGroup: true }
        );
        return res.json({
          event,
        });
      }

      // Ensure an event-scoped Stripe customer exists (reuse provided customer if any)
      let customerId = stripe_customerId;
      if (isStripeMock) {
        customerId = customerId || `cus_mock_${event.id}`;
        const subscriptionId = `sub_mock_${event.id}`;
        await prisma.event.update({
          where: { id: event.id },
          data: {
            stripe_customerId: customerId,
            stripe_subscriptionId: subscriptionId,
            goodPaymentStanding: true,
          },
        });

        await prisma.logs.createMany({
          data: [
            {
              type: LogType.STRIPE_SUBSCRIPTION_CREATED,
              userId: req.user.id,
              ip: req.ip || req.headers["x-forwarded-for"],
              data: {
                id: subscriptionId,
                status: "active",
                customer: customerId,
                items: [
                  {
                    price:
                      process.env.STRIPE_EVENT_SUBSCRIPTION_PRICE_ID ||
                      "price_mock",
                  },
                ],
              },
              eventId: event.id,
            },
          ],
        });
        e2eLog("POST /api/events finalized in Stripe mock mode", {
          requestId: req.id,
          userId: req.user?.id,
          eventId: event?.id,
          customerId,
          subscriptionId,
        });
      } else {
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
            void _;
          }
        }
        if (customerId) {
          // Best-effort verification: ensure this customer belongs to the same user
          try {
            const cust = await stripe.customers.retrieve(customerId);
            const deleted = typeof cust !== "string" && cust?.deleted;
            const prospectOwner =
              typeof cust !== "string"
                ? String(cust?.metadata?.prospectUserId || "")
                : "";
            if (
              !cust ||
              typeof cust === "string" ||
              deleted ||
              (prospectOwner &&
                String(req.user.id || "") &&
                prospectOwner !== String(req.user.id || ""))
            ) {
              // Fallback to creating a new customer if verification fails
              customerId = null;
            }
          } catch (e) {
            void e;
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

        // Ensure the Stripe customer reflects the event name now that the event exists
        try {
          await stripe.customers.update(customerId, {
            name: event.name,
            metadata: { eventId: event.id },
          });
        } catch (e) {
          console.warn(
            "[STRIPE] Failed to update customer name",
            e?.message || e
          );
        }

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
              e2eLog(
                "POST /api/events payment method belongs to a different customer",
                {
                  requestId: req.id,
                  userId: req.user?.id,
                  eventId: event?.id,
                  paymentMethodCustomer: pmCustomer,
                  customerId,
                }
              );
              return res.status(400).json({
                message:
                  "Payment method is not attached to the selected customer. Please add a new card in the wizard and try again.",
              });
            }
          } catch (e) {
            e2eLog("POST /api/events invalid payment method", {
              requestId: req.id,
              userId: req.user?.id,
              eventId: event?.id,
              error: e?.message || e,
            });
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
        e2eLog("POST /api/events subscription created", {
          requestId: req.id,
          userId: req.user?.id,
          eventId: event?.id,
          customerId,
          subscriptionId: subscription?.id,
          subscriptionStatus: subscription?.status,
        });
      }

      e2eLog("POST /api/events success", {
        requestId: req.id,
        userId: req.user?.id,
        eventId: event?.id,
      });
      await identifyApiGroup(req, {
        eventId: event.id,
        eventProperties: {
          event_name: event.name,
          event_slug: event.slug,
          finalized: true,
        },
      });
      await captureApiEvent(
        req,
        "api_event_created",
        {
          event_id: event.id,
          event_name: event.name,
          event_slug: event.slug,
          finalized: true,
          subscription_status: subscription?.status || null,
          good_payment_standing: ["active", "trialing"].includes(
            subscription?.status || ""
          ),
        },
        { eventId: event.id, identifyGroup: true }
      );
      res.json({
        event,
      });
    } catch (e) {
      e2eLog("POST /api/events failed", {
        requestId: req.id,
        userId: req.user?.id,
        eventId: event?.id,
        subscriptionId: subscription?.id,
        error: e?.message || e,
      });
      console.log(e);

      // Best-effort cleanup if one side failed
      try {
        if (event?.id) {
          await prisma.event.delete({ where: { id: event.id } });
          e2eLog("POST /api/events cleanup removed event", {
            requestId: req.id,
            userId: req.user?.id,
            eventId: event?.id,
          });
        }
      } catch (e) {
        void e;
      }
      try {
        if (subscription?.id) {
          await stripe.subscriptions.cancel(subscription.id);
          e2eLog("POST /api/events cleanup canceled subscription", {
            requestId: req.id,
            userId: req.user?.id,
            subscriptionId: subscription?.id,
          });
        }
      } catch (e) {
        void e;
      }

      reportApiError(e, req);
      res.status(500).json({ message: "Error" });
    }
  },
];

export const query = [
  (req, res) => {
    return res.json(zerialize(eventSchema));
  },
];
