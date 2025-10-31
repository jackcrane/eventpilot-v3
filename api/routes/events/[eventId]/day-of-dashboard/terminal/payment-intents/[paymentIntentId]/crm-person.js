import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { z } from "zod";
import { LogType } from "@prisma/client";
import { reportApiError } from "#util/reportApiError.js";
import { stripe } from "#stripe";
import {
  ensureCrmPersonForPaymentIntent,
  formatCrmPersonSummary,
} from "#util/crmPersonFromPaymentIntent.js";
import { resolveEventAccess } from "../../payment-intents.js";
import { serializeError } from "#serializeError";

const TAP_TO_PAY_EMAIL_LABEL = "Tap to Pay";
const PAYMENT_INTENT_EXPAND = [
  "charges.data.payment_method_details",
  "latest_charge.payment_method_details",
];

const emailOptions = z
  .union([
    z
      .string()
      .trim()
      .max(320, "Email must be 320 characters or fewer")
      .email("Email must be a valid email"),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed.toLowerCase() : null;
  });

const updateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(160, "Name must be 160 characters or fewer"),
  email: emailOptions,
});

const formatPaymentIntentSummary = (paymentIntent) => {
  if (!paymentIntent) {
    return null;
  }
  return {
    id: paymentIntent.id,
    amount: typeof paymentIntent.amount === "number" ? paymentIntent.amount : null,
    currency: paymentIntent.currency ?? null,
    status: paymentIntent.status ?? null,
  };
};

const retrievePaymentIntent = async (paymentIntentId, stripeAccountId) => {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    stripeAccount: stripeAccountId,
    expand: PAYMENT_INTENT_EXPAND,
  });
  return paymentIntent;
};

const validatePaymentIntentEvent = (paymentIntent, eventId) => {
  const metadataEventId = paymentIntent?.metadata?.eventId;
  if (metadataEventId && metadataEventId !== eventId) {
    return false;
  }
  return true;
};

export const get = [
  verifyAuth(["manager", "dod:pointOfSale"]),
  async (req, res) => {
    const { eventId, paymentIntentId } = req.params;

    try {
      const event = await resolveEventAccess(req);
      if (!event || event.eventId !== eventId) {
        return res
          .status(403)
          .json({ message: "Access forbidden: event mismatch" });
      }

      const resolvedEventId = event.eventId;
      const stripeAccountId = event.stripeConnectedAccountId?.trim() || null;
      if (!stripeAccountId) {
        return res
          .status(400)
          .json({ message: "Event is not connected to Stripe" });
      }

      let paymentIntent;
      try {
        paymentIntent = await retrievePaymentIntent(paymentIntentId, stripeAccountId);
      } catch (error) {
        console.error("Failed to retrieve payment intent for CRM attachment", error);
        return res.status(404).json({ message: "Payment intent not found" });
      }

      if (!validatePaymentIntentEvent(paymentIntent, resolvedEventId)) {
        return res.status(404).json({ message: "Payment intent not found" });
      }

      const { crmPerson, created } = await ensureCrmPersonForPaymentIntent({
        paymentIntent,
        eventId: resolvedEventId,
        stripeAccountId,
        dayOfDashboardAccountId: req.dayOfDashboardAccount?.id ?? null,
      });

      return res.json({
        paymentIntent: formatPaymentIntentSummary(paymentIntent),
        crmPerson: formatCrmPersonSummary(crmPerson),
        created,
      });
    } catch (error) {
      console.error(
        "Failed to resolve CRM person for payment intent",
        error
      );
      reportApiError(error, req);
      return res
        .status(500)
        .json({ message: "Failed to resolve CRM person for payment intent" });
    }
  },
];

export const put = [
  verifyAuth(["manager", "dod:pointOfSale"]),
  async (req, res) => {
    const { eventId, paymentIntentId } = req.params;

    try {
      const event = await resolveEventAccess(req);
      if (!event || event.eventId !== eventId) {
        return res
          .status(403)
          .json({ message: "Access forbidden: event mismatch" });
      }

      const stripeAccountId = event.stripeConnectedAccountId?.trim() || null;
      if (!stripeAccountId) {
        return res
          .status(400)
          .json({ message: "Event is not connected to Stripe" });
      }

      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: serializeError(parsed) });
      }

      let paymentIntent;
      try {
        paymentIntent = await retrievePaymentIntent(paymentIntentId, stripeAccountId);
      } catch (error) {
        console.error("Failed to retrieve payment intent for CRM update", error);
        return res.status(404).json({ message: "Payment intent not found" });
      }

      const resolvedEventId = event.eventId;
      if (!validatePaymentIntentEvent(paymentIntent, resolvedEventId)) {
        return res.status(404).json({ message: "Payment intent not found" });
      }

      const { crmPerson } = await ensureCrmPersonForPaymentIntent({
        paymentIntent,
        eventId: resolvedEventId,
        stripeAccountId,
        dayOfDashboardAccountId: req.dayOfDashboardAccount?.id ?? null,
      });

      if (!crmPerson) {
        return res
          .status(500)
          .json({ message: "Unable to determine CRM person for payment intent" });
      }

      const { name, email } = parsed.data;

      await prisma.$transaction(async (tx) => {
        await tx.crmPerson.update({
          where: { id: crmPerson.id },
          data: { name },
        });

        if (email !== undefined) {
          if (email === null) {
            await tx.crmPersonEmail.updateMany({
              where: {
                crmPersonId: crmPerson.id,
                deleted: false,
              },
              data: {
                deleted: true,
              },
            });
          } else {
            const existing = await tx.crmPersonEmail.findFirst({
              where: {
                crmPersonId: crmPerson.id,
                deleted: false,
              },
            });

            if (existing) {
              await tx.crmPersonEmail.update({
                where: { id: existing.id },
                data: {
                  email,
                  label: existing.label || TAP_TO_PAY_EMAIL_LABEL,
                },
              });
            } else {
              await tx.crmPersonEmail.create({
                data: {
                  crmPersonId: crmPerson.id,
                  email,
                  label: TAP_TO_PAY_EMAIL_LABEL,
                },
              });
            }
          }
        }
      });

      await prisma.logs.create({
        data: {
          type: LogType.CRM_PERSON_MODIFIED,
          crmPersonId: crmPerson.id,
          eventId: resolvedEventId,
          dayOfDashboardAccountId: req.dayOfDashboardAccount?.id ?? undefined,
          data: {
            origin: "DAY_OF_POINT_OF_SALE",
            paymentIntentId: paymentIntent.id,
          },
        },
      });

      const updatedPerson = await prisma.crmPerson.findFirst({
        where: { id: crmPerson.id },
        include: {
          emails: {
            where: { deleted: false },
          },
        },
      });

      const summary = formatCrmPersonSummary(updatedPerson);

      return res.json({
        paymentIntent: formatPaymentIntentSummary(paymentIntent),
        crmPerson: summary,
        created: false,
      });
    } catch (error) {
      console.error("Failed to update CRM person from payment intent", error);
      reportApiError(error, req);
      return res
        .status(500)
        .json({ message: "Failed to update CRM person for payment intent" });
    }
  },
];
