import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { serializeError } from "#serializeError";
import { z } from "zod";
import { reportApiError } from "#util/reportApiError.js";
import {
  derivePinLookupKey,
  generateDashboardPin,
  hashPin,
  normalizePermissions,
} from "#util/dayOfDashboard.js";
import {
  formatProvisioner,
  provisionerSelect,
} from "./shared.js";

const baseProvisionerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name must have at least 1 character")
    .max(160, "Name must be 160 characters or fewer")
    .optional()
    .nullable(),
  instanceId: z.string().cuid("Invalid instance selected"),
  permissions: z
    .array(z.string().min(1, "Permission must be a non-empty string"))
    .min(1, "At least one permission is required"),
  jwtExpiresInSeconds: z
    .number({ coerce: true })
    .int("Expiration must be a whole number of seconds")
    .min(60, "Expiration must be at least 60 seconds")
    .max(60 * 60 * 24 * 7, "Expiration cannot exceed 7 days")
    .optional(),
  stripeLocationId: z.string().cuid().optional().nullable(),
});

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;

    try {
      const provisioners = await prisma.dayOfDashboardProvisioner.findMany({
        where: { eventId },
        select: provisionerSelect,
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        provisioners: provisioners.map((provisioner) =>
          formatProvisioner(provisioner)
        ),
      });
    } catch (error) {
      console.error("Failed to fetch day-of dashboard provisioners", error);
      reportApiError(error, req);
      return res.status(500).json({ message: "Failed to fetch provisioners" });
    }
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const parseResult = baseProvisionerSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({ message: serializeError(parseResult) });
    }

    const {
      name,
      instanceId,
      permissions: rawPermissions,
      jwtExpiresInSeconds,
      stripeLocationId,
    } = parseResult.data;

    const permissions = normalizePermissions(rawPermissions);
    if (!permissions.length) {
      return res.status(400).json({ message: "At least one permission required" });
    }

    const instance = await prisma.eventInstance.findFirst({
      where: { id: instanceId, eventId },
      select: { id: true },
    });

    if (!instance) {
      return res.status(400).json({ message: "Invalid instance" });
    }

    const expiresIn = jwtExpiresInSeconds ?? 3600;
    const pointOfSaleSelected = permissions.includes("POINT_OF_SALE");
    let resolvedStripeLocation = null;

    if (pointOfSaleSelected) {
      if (!stripeLocationId) {
        return res.status(400).json({
          message: "Select a Stripe Terminal address before enabling point of sale",
        });
      }

      const location = await prisma.stripeLocation.findFirst({
        where: {
          id: stripeLocationId,
          eventId,
          deleted: false,
        },
        select: {
          id: true,
          stripeLocationId: true,
        },
      });

      if (!location) {
        return res.status(400).json({ message: "Selected address is no longer available" });
      }

      resolvedStripeLocation = location;
    }

    let pin;
    let pinLookupKey;
    let pinHash;

    for (let attempts = 0; attempts < 10; attempts += 1) {
      pin = generateDashboardPin();
      pinLookupKey = derivePinLookupKey(pin);
      const existing = await prisma.dayOfDashboardProvisioner.findUnique({
        where: { pinLookupKey },
        select: { id: true },
      });
      if (!existing) {
        pinHash = await hashPin(pin);
        break;
      }
    }

    if (!pinHash) {
      return res
        .status(500)
        .json({ message: "Unable to generate a unique access pin" });
    }

    try {
      const provisioner = await prisma.$transaction(async (tx) => {
        const created = await tx.dayOfDashboardProvisioner.create({
          data: {
            eventId,
            instanceId: instance.id,
            name: name?.trim() || null,
            permissions,
            jwtExpiresInSeconds: expiresIn,
            pin,
            pinLookupKey,
            pinHash,
            lastPinGeneratedAt: new Date(),
            stripeLocationId: resolvedStripeLocation?.id || null,
          },
          select: provisionerSelect,
        });

        return created;
      });

      return res.status(201).json({
        provisioner: formatProvisioner(provisioner),
        pin,
      });
    } catch (error) {
      console.error("Failed to create day-of dashboard provisioner", error);
      reportApiError(error, req);
      return res
        .status(500)
        .json({ message: "Failed to create provisioner" });
    }
  },
];
