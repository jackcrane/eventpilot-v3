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
    return { id: req.dayOfDashboardAccount.eventId };
  }

  if (!req.user?.id) {
    return null;
  }

  return prisma.event.findFirst({
    where: { id: req.params.eventId, userId: req.user.id },
    select: { id: true },
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

    const parseResult = requestSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      return res.status(400).json({ message: serializeError(parseResult) });
    }

    const requestedLocationId = parseResult.data?.locationId?.trim();
    const fallbackLocationId = process.env.STRIPE_TERMINAL_DEFAULT_LOCATION;
    const locationId = requestedLocationId || fallbackLocationId || undefined;

    try {
      const token = await stripe.terminal.connectionTokens.create({
        ...(locationId ? { location: locationId } : {}),
      });

      return res.json({
        secret: token.secret,
        expiresAt: token.expires_at ?? null,
        locationId: locationId ?? null,
      });
    } catch (error) {
      console.error("Failed to create Stripe Terminal connection token", error);
      return res
        .status(500)
        .json({ message: "Failed to create connection token" });
    }
  },
];
