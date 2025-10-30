import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { serializeError } from "#serializeError";
import { z } from "zod";
import { normalizePermissions } from "#util/dayOfDashboard.js";
import { formatProvisioner, provisionerSelect } from "../shared.js";
import { reportApiError } from "#util/reportApiError.js";

const updateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name must have at least 1 character")
      .max(160, "Name must be 160 characters or fewer")
      .optional()
      .nullable(),
    instanceId: z.string().cuid("Invalid instance selected").optional(),
    permissions: z
      .array(z.string().min(1, "Permission must be a non-empty string"))
      .min(1, "At least one permission is required")
      .optional(),
    jwtExpiresInSeconds: z
      .number({ coerce: true })
      .int("Expiration must be a whole number of seconds")
      .min(60, "Expiration must be at least 60 seconds")
      .max(60 * 60 * 24 * 7, "Expiration cannot exceed 7 days")
      .optional(),
    stripeLocationId: z.string().cuid().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, provisionerId } = req.params;

    const provisioner = await prisma.dayOfDashboardProvisioner.findFirst({
      where: { id: provisionerId, eventId },
      select: provisionerSelect,
    });

    if (!provisioner) {
      return res.status(404).json({ message: "Provisioner not found" });
    }

    return res.json({ provisioner: formatProvisioner(provisioner) });
  },
];

export const put = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, provisionerId } = req.params;
    const parseResult = updateSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({ message: serializeError(parseResult) });
    }

    const data = parseResult.data;

    const provisioner = await prisma.dayOfDashboardProvisioner.findFirst({
      where: { id: provisionerId, eventId },
      select: {
        id: true,
        permissions: true,
        stripeLocationId: true,
        stripeLocation: {
          select: {
            id: true,
            stripeLocationId: true,
          },
        },
      },
    });

    if (!provisioner) {
      return res.status(404).json({ message: "Provisioner not found" });
    }

    let resolvedInstanceId = undefined;
    if (Object.prototype.hasOwnProperty.call(data, "instanceId")) {
      const instance = await prisma.eventInstance.findFirst({
        where: { id: data.instanceId, eventId },
        select: { id: true },
      });
      if (!instance) {
        return res.status(400).json({ message: "Invalid instance" });
      }
      resolvedInstanceId = instance.id;
    }

    const normalizedPermissions = data.permissions
      ? normalizePermissions(data.permissions)
      : undefined;

    let resolvedStripeLocation = undefined;
    if (Object.prototype.hasOwnProperty.call(data, "stripeLocationId")) {
      if (data.stripeLocationId === null) {
        resolvedStripeLocation = null;
      } else if (data.stripeLocationId) {
        const location = await prisma.stripeLocation.findFirst({
          where: {
            id: data.stripeLocationId,
            eventId,
            deleted: false,
          },
          select: {
            id: true,
            stripeLocationId: true,
          },
        });

        if (!location) {
          return res
            .status(400)
            .json({ message: "Selected address is no longer available" });
        }

        resolvedStripeLocation = location;
      }
    }

    const existingPermissions = normalizePermissions(provisioner.permissions);
    const nextPermissions = normalizedPermissions ?? existingPermissions;
    const nextStripeLocation =
      resolvedStripeLocation === undefined
        ? provisioner.stripeLocation
        : resolvedStripeLocation;

    if (
      nextPermissions.includes("POINT_OF_SALE") &&
      (!nextStripeLocation || !nextStripeLocation.stripeLocationId)
    ) {
      return res.status(400).json({
        message:
          "Select a Stripe Terminal address before enabling point of sale",
      });
    }

    if (normalizedPermissions && !normalizedPermissions.length) {
      return res
        .status(400)
        .json({ message: "At least one permission required" });
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const shouldSyncAccounts =
          normalizedPermissions !== undefined &&
          (normalizedPermissions.length !== existingPermissions.length ||
            normalizedPermissions.some(
              (permission, index) => permission !== existingPermissions[index]
            ));

        const provisioner = await tx.dayOfDashboardProvisioner.update({
          where: { id: provisionerId },
          data: {
            name: Object.prototype.hasOwnProperty.call(data, "name")
              ? data.name?.trim() || null
              : undefined,
            instanceId: resolvedInstanceId,
            permissions: normalizedPermissions,
            jwtExpiresInSeconds: data.jwtExpiresInSeconds,
            stripeLocationId:
              resolvedStripeLocation === undefined
                ? undefined
                : resolvedStripeLocation?.id || null,
          },
          select: provisionerSelect,
        });

        if (shouldSyncAccounts) {
          await tx.dayOfDashboardAccount.updateMany({
            where: { provisionerId },
            data: {
              permissions: normalizedPermissions,
            },
          });
        }

        if (resolvedStripeLocation?.stripeLocationId) {
          await tx.event.update({
            where: { id: eventId },
            data: {
              stripeTerminalDefaultLocationId:
                resolvedStripeLocation.stripeLocationId,
            },
          });
        }

        return provisioner;
      });

      return res.json({ provisioner: formatProvisioner(updated) });
    } catch (error) {
      console.error("Failed to update day-of dashboard provisioner", error);
      reportApiError(error, req);
      return res.status(500).json({ message: "Failed to update provisioner" });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, provisionerId } = req.params;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const provisioner = await tx.dayOfDashboardProvisioner.findFirst({
          where: { id: provisionerId, eventId },
          select: provisionerSelect,
        });

        if (!provisioner) {
          return null;
        }

        await tx.dayOfDashboardAccount.updateMany({
          where: { provisionerId },
          data: {
            deleted: true,
            tokenVersion: { increment: 1 },
          },
        });

        await tx.dayOfDashboardProvisioner.delete({
          where: { id: provisionerId },
        });

        return provisioner;
      });

      if (!result) {
        return res.status(404).json({ message: "Provisioner not found" });
      }

      return res.json({
        provisioner: formatProvisioner({
          ...result,
          deleted: true,
        }),
      });
    } catch (error) {
      console.error("Failed to delete day-of dashboard provisioner", error);
      reportApiError(error, req);
      return res.status(500).json({ message: "Failed to delete provisioner" });
    }
  },
];
