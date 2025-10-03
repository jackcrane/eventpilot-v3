import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { serializeError } from "#serializeError";
import { z } from "zod";
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
  instanceId: z.string().cuid().optional().nullable(),
  permissions: z
    .array(z.string().min(1, "Permission must be a non-empty string"))
    .min(1, "At least one permission is required"),
  jwtExpiresInSeconds: z
    .number({ coerce: true })
    .int("Expiration must be a whole number of seconds")
    .min(60, "Expiration must be at least 60 seconds")
    .max(60 * 60 * 24 * 7, "Expiration cannot exceed 7 days")
    .optional(),
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
    } = parseResult.data;

    const permissions = normalizePermissions(rawPermissions);
    if (!permissions.length) {
      return res.status(400).json({ message: "At least one permission required" });
    }

    let resolvedInstanceId = null;
    if (instanceId) {
      const instance = await prisma.eventInstance.findFirst({
        where: { id: instanceId, eventId },
        select: { id: true },
      });

      if (!instance) {
        return res.status(400).json({ message: "Invalid instance" });
      }
      resolvedInstanceId = instance.id;
    }

    const expiresIn = jwtExpiresInSeconds ?? 3600;

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
      const provisioner = await prisma.dayOfDashboardProvisioner.create({
        data: {
          eventId,
          instanceId: resolvedInstanceId,
          name: name?.trim() || null,
          permissions,
          jwtExpiresInSeconds: expiresIn,
          pin,
          pinLookupKey,
          pinHash,
          lastPinGeneratedAt: new Date(),
        },
        select: provisionerSelect,
      });

      return res.status(201).json({
        provisioner: formatProvisioner(provisioner),
        pin,
      });
    } catch (error) {
      console.error("Failed to create day-of dashboard provisioner", error);
      return res
        reportApiError(error, req);
        .status(500)
        .json({ message: "Failed to create provisioner" });
    }
  },
];
