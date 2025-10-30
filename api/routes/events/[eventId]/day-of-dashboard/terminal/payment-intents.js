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

export const resolveEventAccess = async (req) => {
  if (req.isDayOfDashboardRequest) {
    if (req.dayOfDashboardAccount?.eventId !== req.params.eventId) {
      return null;
    }
    const account = await prisma.dayOfDashboardAccount.findUnique({
      where: { id: req.dayOfDashboardAccount.id },
      select: {
        id: true,
        eventId: true,
        instanceId: true,
        event: {
          select: {
            id: true,
            name: true,
            stripeConnectedAccountId: true,
          },
        },
        provisioner: {
          select: {
            instanceId: true,
            stripeLocation: {
              select: {
                id: true,
                stripeLocationId: true,
                deleted: true,
              },
            },
          },
        },
      },
    });
    if (!account || account.eventId !== req.params.eventId) {
      return null;
    }
    const accountInstanceId =
      typeof account.instanceId === "string"
        ? account.instanceId.trim()
        : null;
    const provisionerInstanceId =
      typeof account.provisioner?.instanceId === "string"
        ? account.provisioner.instanceId.trim()
        : null;
    const assignedInstanceId =
      accountInstanceId || provisionerInstanceId || null;
    return {
      id: account.event.id,
      eventId: account.event.id,
      type: "dayOf",
      name: account.event?.name ?? null,
      stripeConnectedAccountId:
        account.event?.stripeConnectedAccountId?.trim() || null,
      assignedStripeLocationId:
        account.provisioner?.stripeLocation?.stripeLocationId?.trim() || null,
      assignedLocationDeleted: Boolean(
        account.provisioner?.stripeLocation?.deleted
      ),
      assignedInstanceId,
    };
  }

  if (!req.user?.id) {
    return null;
  }

  const event = await prisma.event.findFirst({
    where: { id: req.params.eventId, userId: req.user.id },
    select: {
      id: true,
      name: true,
      stripeConnectedAccountId: true,
    },
  });
  if (!event) {
    return null;
  }
  return {
    id: event.id,
    eventId: event.id,
    type: "manager",
    name: event.name ?? null,
    stripeConnectedAccountId: event.stripeConnectedAccountId?.trim() || null,
  };
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

    const {
      amount,
      currency: currencyInput,
      description,
      metadata,
      receiptEmail,
      locationId,
    } = parseResult.data;

    const currency = (currencyInput || "usd").toLowerCase();
    const connectedAccountId =
      event.stripeConnectedAccountId?.trim() || null;
    const requestedLocationId = locationId?.trim() || null;
    let terminalLocationId = null;

    if (event.type === "dayOf") {
      if (event.assignedLocationDeleted) {
        return res.status(400).json({
          message:
            "The assigned Stripe Terminal address has been removed. Update the provisioner before charging a card.",
        });
      }
      const assigned = event.assignedStripeLocationId;
      if (!assigned) {
        return res.status(400).json({
          message:
            "Assign a Stripe Terminal address to this provisioner before charging a card.",
        });
      }
      if (requestedLocationId && requestedLocationId !== assigned) {
        return res.status(400).json({
          message:
            "Stripe Terminal location mismatch. Use the address assigned to your provisioner.",
        });
      }
      terminalLocationId = assigned;
    } else if (requestedLocationId) {
      const locationRecord = await prisma.stripeLocation.findFirst({
        where: {
          eventId: event.id,
          stripeLocationId: requestedLocationId,
          deleted: false,
        },
        select: { stripeLocationId: true },
      });
      if (!locationRecord) {
        return res.status(400).json({
          message:
            "The requested Stripe Terminal address is not available for this event.",
        });
      }
      terminalLocationId = locationRecord.stripeLocationId;
    } else {
      return res.status(400).json({
        message:
          "Specify a Stripe Terminal address when creating a card-present payment.",
      });
    }

    if (!connectedAccountId) {
      return res
        .status(400)
        .json({ message: "Event is not connected to Stripe" });
    }

    if (event.type === "dayOf" && !event.assignedInstanceId) {
      return res.status(400).json({
        message:
          "Assign an event instance to this provisioner before charging a card.",
      });
    }

    try {
      const metadataPayload = {
        eventId: event.id,
        source: "day-of-dashboard",
        ...(metadata || {}),
      };

      if (event.type === "dayOf") {
        metadataPayload.scope = "EVENTPILOT:POINT_OF_SALE";
        if (event.assignedInstanceId) {
          metadataPayload.instanceId = event.assignedInstanceId;
        }
        if (req.isDayOfDashboardRequest && req.dayOfDashboardAccount?.id) {
          metadataPayload.dayOfAccountId = req.dayOfDashboardAccount.id;
        }
      } else if (
        req.isDayOfDashboardRequest &&
        req.dayOfDashboardAccount?.id
      ) {
        metadataPayload.dayOfAccountId = req.dayOfDashboardAccount.id;
      }

      const intentPayload = {
        amount,
        currency,
        description,
        receipt_email: receiptEmail,
        payment_method_types: ["card_present"],
        capture_method: "automatic",
        metadata: metadataPayload,
      };

      if (terminalLocationId) {
        intentPayload.metadata.terminalLocationId = terminalLocationId;
      }

      const intent = await stripe.paymentIntents.create(intentPayload, {
        stripeAccount: connectedAccountId,
      });

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
