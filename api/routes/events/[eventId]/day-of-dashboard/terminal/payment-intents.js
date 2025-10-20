import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { stripe } from "#stripe";
import { verifyAuth } from "#verifyAuth";
import { z } from "zod";

const currencySchema = z
  .string()
  .trim()
  .refine(
    (value) => /^[a-zA-Z]{3}$/.test(value),
    "currency must be a three-letter ISO code"
  )
  .transform((value) => value.toLowerCase());

const createSchema = z.object({
  amount: z
    .number({
      required_error: "amount is required",
      invalid_type_error: "amount must be a number",
    })
    .int("amount must be an integer")
    .min(1, "amount must be at least 1"),
  currency: currencySchema.optional(),
  description: z
    .string()
    .trim()
    .max(200, "description must be 200 characters or fewer")
    .optional(),
  metadata: z
    .record(
      z
        .string()
        .max(200, "metadata values must be 200 characters or fewer")
    )
    .optional(),
  receiptEmail: z
    .string()
    .email("receiptEmail must be a valid email")
    .optional(),
  locationId: z
    .string()
    .trim()
    .min(1, "locationId must be a non-empty string")
    .optional(),
});

const resolveEventAccess = async (req) => {
  if (req.isDayOfDashboardRequest) {
    if (req.dayOfDashboardAccount?.eventId !== req.params.eventId) {
      return null;
    }
    return prisma.event.findUnique({
      where: { id: req.params.eventId },
      select: {
        id: true,
        name: true,
        stripeTerminalDefaultLocationId: true,
      },
    });
  }

  if (!req.user?.id) {
    return null;
  }

  return prisma.event.findFirst({
    where: { id: req.params.eventId, userId: req.user.id },
    select: {
      id: true,
      name: true,
      stripeTerminalDefaultLocationId: true,
    },
  });
};

export const post = [
  verifyAuth(["manager", "dod:pointOfSale"]),
  async (req, res) => {
    const event = await resolveEventAccess(req);
    if (!event) {
      return res
        .status(403)
        .json({ message: "Access forbidden: event mismatch" });
    }

    const parseResult = createSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      return res.status(400).json({ message: serializeError(parseResult) });
    }

    const { amount, currency: currencyInput, description, metadata, receiptEmail, locationId } =
      parseResult.data;

    const currency = (currencyInput || "usd").toLowerCase();
    const eventDefaultLocationId =
      event.stripeTerminalDefaultLocationId?.trim() || null;
    const resolvedLocationId =
      locationId?.trim() || eventDefaultLocationId || null;

    try {
      const intentPayload = {
        amount,
        currency,
        description,
        receipt_email: receiptEmail,
        payment_method_types: ["card_present"],
        capture_method: "automatic",
        metadata: {
          eventId: event.id,
          source: "day-of-dashboard",
          ...(req.isDayOfDashboardRequest && req.dayOfDashboardAccount?.id
            ? { dayOfAccountId: req.dayOfDashboardAccount.id }
            : {}),
          ...(metadata || {}),
        },
      };

      if (resolvedLocationId) {
        intentPayload.metadata.terminalLocationId = resolvedLocationId;
      }

      const intent = await stripe.paymentIntents.create(intentPayload);

      return res.json({
        paymentIntent: {
          id: intent.id,
          clientSecret: intent.client_secret,
          amount: intent.amount,
          currency: intent.currency,
          status: intent.status,
        },
      });
    } catch (error) {
      console.error("Failed to create Stripe Terminal payment intent", error);
      return res
        .status(500)
        .json({ message: "Failed to create payment intent" });
    }
  },
];
