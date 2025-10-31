import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import { stripe } from "#stripe";
import { verifyAuth } from "#verifyAuth";
import { z } from "zod";

const requestSchema = z
  .object({
    locationId: z
      .string()
      .trim()
      .min(1, "locationId must be a non-empty string")
      .optional(),
  })
  .partial()
  .optional();

const resolveEventAccess = async (req) => {
  if (req.isDayOfDashboardRequest) {
    if (req.dayOfDashboardAccount?.eventId !== req.params.eventId) {
      return null;
    }
    const account = await prisma.dayOfDashboardAccount.findUnique({
      where: { id: req.dayOfDashboardAccount.id },
      select: {
        id: true,
        eventId: true,
        event: {
          select: {
            id: true,
            stripeConnectedAccountId: true,
          },
        },
        provisioner: {
          select: {
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
    return {
      id: account.event.id,
      type: "dayOf",
      eventId: account.event.id,
      stripeConnectedAccountId:
        account.event?.stripeConnectedAccountId?.trim() || null,
      assignedStripeLocationId:
        account.provisioner?.stripeLocation?.stripeLocationId?.trim() || null,
      assignedLocationDeleted: Boolean(
        account.provisioner?.stripeLocation?.deleted
      ),
    };
  }

  if (!req.user?.id) {
    return null;
  }

  const event = await prisma.event.findFirst({
    where: { id: req.params.eventId, userId: req.user.id },
    select: { id: true, stripeConnectedAccountId: true },
  });
  if (!event) {
    return null;
  }
  return {
    id: event.id,
    eventId: event.id,
    type: "manager",
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

    const parseResult = requestSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      return res.status(400).json({ message: serializeError(parseResult) });
    }

    const requestedLocationId = parseResult.data?.locationId?.trim() || null;
    const connectedAccountId =
      event.stripeConnectedAccountId?.trim() || null;
    let locationIdToUse = null;

    if (event.type === "dayOf") {
      if (event.assignedLocationDeleted) {
        return res.status(400).json({
          message:
            "The assigned Stripe Terminal address has been removed. Update the provisioner before requesting a token.",
        });
      }
      const assigned = event.assignedStripeLocationId;
      if (!assigned) {
        return res.status(400).json({
          message:
            "Assign a Stripe Terminal address to this provisioner before requesting a token.",
        });
      }
      if (requestedLocationId && requestedLocationId !== assigned) {
        return res.status(400).json({
          message:
            "Stripe Terminal location mismatch. Use the address assigned to your provisioner.",
        });
      }
      locationIdToUse = assigned;
    } else {
      if (requestedLocationId) {
        const managerLocation = await prisma.stripeLocation.findFirst({
          where: {
            eventId: event.id,
            stripeLocationId: requestedLocationId,
            deleted: false,
          },
          select: { stripeLocationId: true },
        });
        if (!managerLocation) {
          return res.status(400).json({
            message:
              "The requested Stripe Terminal address is not available for this event.",
          });
        }
        locationIdToUse = managerLocation.stripeLocationId;
      } else {
        return res.status(400).json({
          message:
            "Specify a Stripe Terminal address when generating a connection token.",
        });
      }
    }

    try {
      const token = await stripe.terminal.connectionTokens.create(
        {
          location: locationIdToUse,
        },
        {
          ...(connectedAccountId ? { stripeAccount: connectedAccountId } : {}),
        }
      );

      return res.json({
        secret: token.secret,
        expiresAt: token.expires_at ?? null,
        locationId: locationIdToUse,
      });
    } catch (error) {
      console.error("Failed to create Stripe Terminal connection token", error);
      return res
        .status(500)
        .json({ message: "Failed to create connection token" });
    }
  },
];
