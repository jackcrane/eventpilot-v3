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
    return prisma.event.findUnique({
      where: { id: req.params.eventId },
      select: {
        id: true,
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

    const parseResult = requestSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      return res.status(400).json({ message: serializeError(parseResult) });
    }

    const requestedLocationId = parseResult.data?.locationId?.trim();
    let currentDefaultLocationId =
      event.stripeTerminalDefaultLocationId ?? null;
    const envFallback = process.env.STRIPE_TERMINAL_DEFAULT_LOCATION;

    const persistDefaultLocationId = async (nextLocationId) => {
      if (!nextLocationId || nextLocationId === currentDefaultLocationId) {
        return;
      }
      try {
        await prisma.event.update({
          where: { id: event.id },
          data: { stripeTerminalDefaultLocationId: nextLocationId },
        });
        currentDefaultLocationId = nextLocationId;
      } catch (persistError) {
        console.error(
          "Failed to persist Stripe Terminal default location",
          persistError
        );
      }
    };

    const resolveLocation = async (rawLocationId, { required = false } = {}) => {
      if (!rawLocationId) {
        return null;
      }
      const trimmed = rawLocationId.trim();
      if (!trimmed) {
        return null;
      }
      try {
        const location = await stripe.terminal.locations.retrieve(trimmed);
        return location?.id ?? null;
      } catch (error) {
        const isMissing =
          error?.raw?.param === "location" ||
          error?.raw?.code === "resource_missing" ||
          error?.statusCode === 404;
        if (isMissing) {
          const message = `Stripe Terminal location '${trimmed}' was not found`;
          if (required) {
            return { errorMessage: message };
          }
          console.warn(message);
          return null;
        }
        throw error;
      }
    };

    const ensureFallbackLocation = async () => {
      const { data } = await stripe.terminal.locations.list({ limit: 1 });
      return data?.[0]?.id ?? null;
    };

    try {
      if (requestedLocationId) {
        const result = await resolveLocation(requestedLocationId, {
          required: true,
        });
        if (result?.errorMessage) {
          return res.status(400).json({ message: result.errorMessage });
        }
        if (!result) {
          return res.status(400).json({
            message: `Stripe Terminal location '${requestedLocationId}' could not be used`,
          });
        }
        const token = await stripe.terminal.connectionTokens.create({
          location: result,
        });

        await persistDefaultLocationId(result);

        return res.json({
          secret: token.secret,
          expiresAt: token.expires_at ?? null,
          locationId: result,
        });
      }

      let resolvedLocationId =
        (await resolveLocation(currentDefaultLocationId)) ?? null;

      if (!resolvedLocationId) {
        resolvedLocationId =
          (await resolveLocation(envFallback)) ??
          (await ensureFallbackLocation());
      }

      if (!resolvedLocationId) {
        return res.status(400).json({
          message:
            "No Stripe Terminal locations are available. Create a location in Stripe and assign it as the event default.",
        });
      }

      const token = await stripe.terminal.connectionTokens.create({
        location: resolvedLocationId,
      });

      await persistDefaultLocationId(resolvedLocationId);

      return res.json({
        secret: token.secret,
        expiresAt: token.expires_at ?? null,
        locationId: resolvedLocationId ?? null,
      });
    } catch (error) {
      console.error("Failed to create Stripe Terminal connection token", error);
      return res
        .status(500)
        .json({ message: "Failed to create connection token" });
    }
  },
];
