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
} from "../provisioners/shared.js";
import { accountSelect, formatAccount } from "./shared.js";

const updateSchema = z
  .object({
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
      .min(1, "At least one permission is required")
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const get = [
  verifyAuth([
    "manager",
    "dod:volunteer",
    "dod:registration",
    "dod:pointOfSale",
  ]),
  async (req, res) => {
    const { eventId, accountId } = req.params;

    const account = await prisma.dayOfDashboardAccount.findFirst({
      where: { id: accountId, eventId },
      select: accountSelect,
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    return res.json({ account: formatAccount(account) });
  },
];

export const put = [
  verifyAuth([
    "manager",
    "dod:volunteer",
    "dod:registration",
    "dod:pointOfSale",
  ]),
  async (req, res) => {
    const { eventId, accountId } = req.params;
    const parseResult = updateSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({ message: serializeError(parseResult) });
    }

    const data = parseResult.data;

    if (req.isDayOfDashboardRequest) {
      if (
        !req.dayOfDashboardAccount ||
        req.dayOfDashboardAccount.id !== accountId
      ) {
        return res
          .status(403)
          .json({ message: "Access forbidden: insufficient permissions" });
      }

      if (
        Object.prototype.hasOwnProperty.call(data, "instanceId") ||
        Object.prototype.hasOwnProperty.call(data, "permissions")
      ) {
        return res
          .status(403)
          .json({ message: "Access forbidden: insufficient permissions" });
      }
    }

    const account = await prisma.dayOfDashboardAccount.findFirst({
      where: { id: accountId, eventId },
      select: { id: true, provisionerId: true },
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    let resolvedInstanceId = undefined;
    if (
      Object.prototype.hasOwnProperty.call(data, "instanceId") &&
      !req.isDayOfDashboardRequest
    ) {
      if (data.instanceId === null) {
        resolvedInstanceId = null;
      } else if (data.instanceId) {
        const instance = await prisma.eventInstance.findFirst({
          where: { id: data.instanceId, eventId },
          select: { id: true },
        });
        if (!instance) {
          return res.status(400).json({ message: "Invalid instance" });
        }
        resolvedInstanceId = instance.id;
      }
    }

    const normalizedPermissions =
      !req.isDayOfDashboardRequest && data.permissions
        ? normalizePermissions(data.permissions)
        : undefined;

    if (normalizedPermissions && !normalizedPermissions.length) {
      return res
        .status(400)
        .json({ message: "At least one permission required" });
    }

    try {
      const updated = await prisma.dayOfDashboardAccount.update({
        where: { id: accountId },
        data: {
          name: Object.prototype.hasOwnProperty.call(data, "name")
            ? data.name?.trim() || null
            : undefined,
          instanceId: resolvedInstanceId,
          permissions: normalizedPermissions,
        },
        select: accountSelect,
      });

      return res.json({ account: formatAccount(updated) });
    } catch (error) {
      console.error("Failed to update day-of dashboard account", error);
      reportApiError(error, req);
      return res.status(500).json({ message: "Failed to update account" });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, accountId } = req.params;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.dayOfDashboardAccount.findFirst({
          where: { id: accountId, eventId },
          select: accountSelect,
        });

        if (!existing) {
          return null;
        }

        const updatedAccount = await tx.dayOfDashboardAccount.update({
          where: { id: accountId },
          data: {
            deleted: true,
            tokenVersion: { increment: 1 },
          },
          select: accountSelect,
        });

        let provisioner = null;
        let pin = null;

        if (existing.provisionerId) {
          let nextPin;
          let nextLookupKey;
          let nextHash;

          for (let attempts = 0; attempts < 10; attempts += 1) {
            nextPin = generateDashboardPin();
            nextLookupKey = derivePinLookupKey(nextPin);

            const conflict = await tx.dayOfDashboardProvisioner.findUnique({
              where: { pinLookupKey: nextLookupKey },
              select: { id: true },
            });

            if (!conflict) {
              nextHash = await hashPin(nextPin);
              break;
            }
          }

          if (!nextHash) {
            throw new Error("Unable to generate a unique access pin");
          }

          provisioner = await tx.dayOfDashboardProvisioner.update({
            where: { id: existing.provisionerId },
            data: {
              pin: nextPin,
              pinLookupKey: nextLookupKey,
              pinHash: nextHash,
              lastPinGeneratedAt: new Date(),
              tokenVersion: { increment: 1 },
            },
            select: provisionerSelect,
          });

          pin = nextPin;
        }

        return { account: updatedAccount, provisioner, pin };
      });

      if (!result) {
        return res.status(404).json({ message: "Account not found" });
      }

      const payload = {
        account: formatAccount(result.account),
      };

      if (result.provisioner) {
        payload.provisioner = formatProvisioner(result.provisioner);
      }

      if (result.pin) {
        payload.pin = result.pin;
      }

      return res.json(payload);
    } catch (error) {
      console.error("Failed to delete day-of dashboard account", error);
      reportApiError(error, req);
      return res.status(500).json({ message: "Failed to delete account" });
    }
  },
];
