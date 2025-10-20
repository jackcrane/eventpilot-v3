import { verifyAuth } from "#verifyAuth";
import { prisma } from "#prisma";
import { stripe } from "#stripe";
import { z } from "zod";
import { serializeError } from "#serializeError";
import { reportApiError } from "#util/reportApiError.js";

const formatLocationRecord = (record) => ({
  id: record.id,
  nickname: record.nickname ?? null,
  addressLine1: record.addressLine1,
  addressLine2: record.addressLine2 ?? null,
  city: record.city,
  state: record.state,
  postalCode: record.postalCode,
  country: record.country,
  stripeLocationId: record.stripeLocationId,
  deleted: record.deleted,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

const createSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(1, "Nickname must have at least 1 character")
    .max(80, "Nickname must be 80 characters or fewer")
    .optional()
    .nullable(),
  addressLine1: z
    .string()
    .trim()
    .min(1, "Address line 1 is required")
    .max(120, "Address line 1 must be 120 characters or fewer"),
  addressLine2: z
    .string()
    .trim()
    .max(120, "Address line 2 must be 120 characters or fewer")
    .optional()
    .nullable(),
  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .max(80, "City must be 80 characters or fewer"),
  state: z
    .string()
    .trim()
    .min(1, "State is required")
    .max(60, "State must be 60 characters or fewer"),
  postalCode: z
    .string()
    .trim()
    .min(1, "Postal code is required")
    .max(20, "Postal code must be 20 characters or fewer"),
});

const resolveEvent = async (eventId, userId) => {
  if (!userId) return null;
  return prisma.event.findFirst({
    where: { id: eventId, userId },
    select: {
      id: true,
      name: true,
      slug: true,
      stripeTerminalDefaultLocationId: true,
    },
  });
};

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    try {
      const event = await resolveEvent(req.params.eventId, req.user?.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const locations = await prisma.stripeLocation.findMany({
        where: { eventId: event.id, deleted: false },
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        locations: locations.map(formatLocationRecord),
        defaultStripeTerminalLocationId:
          event.stripeTerminalDefaultLocationId ?? null,
      });
    } catch (error) {
      console.error("Failed to fetch Stripe terminal locations", error);
      reportApiError(error, req);
      return res.status(500).json({ message: "Failed to load locations" });
    }
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const event = await resolveEvent(req.params.eventId, req.user?.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const parseResult = createSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      return res.status(400).json({ message: serializeError(parseResult) });
    }

    const { nickname, addressLine1, addressLine2, city, state, postalCode } =
      parseResult.data;

    try {
      const displayName = (nickname || event.name || "EventPilot POS").slice(
        0,
        80
      );
      const stripeLocation = await stripe.terminal.locations.create({
        display_name: displayName,
        address: {
          line1: addressLine1,
          line2: addressLine2 || undefined,
          city,
          state,
          postal_code: postalCode,
          country: "US",
        },
        metadata: {
          eventId: event.id,
          eventSlug: event.slug || "",
        },
      });

      const created = await prisma.$transaction(async (tx) => {
        const record = await tx.stripeLocation.create({
          data: {
            eventId: event.id,
            nickname: nickname?.trim() || null,
            addressLine1,
            addressLine2: addressLine2?.trim() || null,
            city,
            state,
            postalCode,
            stripeLocationId: stripeLocation.id,
          },
        });

        await tx.event.update({
          where: { id: event.id },
          data: { stripeTerminalDefaultLocationId: stripeLocation.id },
        });

        return record;
      });

      return res.status(201).json({
        location: formatLocationRecord(created),
        stripeLocationId: stripeLocation.id,
      });
    } catch (error) {
      console.error("Failed to create Stripe terminal location", error);
      reportApiError(error, req);
      const message =
        error?.raw?.message ||
        error?.message ||
        "Failed to create Stripe location";
      return res.status(500).json({ message });
    }
  },
];
