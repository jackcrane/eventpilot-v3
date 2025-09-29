import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { serializeError } from "#serializeError";
import { z } from "zod";
import { normalizePermissions } from "#util/dayOfDashboard.js";
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
  verifyAuth(["manager"]),
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
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, accountId } = req.params;
    const parseResult = updateSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({ message: serializeError(parseResult) });
    }

    const data = parseResult.data;

    const account = await prisma.dayOfDashboardAccount.findFirst({
      where: { id: accountId, eventId },
      select: { id: true, provisionerId: true },
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    let resolvedInstanceId = undefined;
    if (Object.prototype.hasOwnProperty.call(data, "instanceId")) {
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

    const normalizedPermissions = data.permissions
      ? normalizePermissions(data.permissions)
      : undefined;

    if (normalizedPermissions && !normalizedPermissions.length) {
      return res.status(400).json({ message: "At least one permission required" });
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
      return res.status(500).json({ message: "Failed to update account" });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, accountId } = req.params;

    try {
      const result = await prisma.dayOfDashboardAccount.findFirst({
        where: { id: accountId, eventId },
        select: accountSelect,
      });

      if (!result) {
        return res.status(404).json({ message: "Account not found" });
      }

      await prisma.dayOfDashboardAccount.update({
        where: { id: accountId },
        data: {
          deleted: true,
          tokenVersion: { increment: 1 },
        },
      });

      return res.json({
        account: formatAccount({
          ...result,
          deleted: true,
          tokenVersion: result.tokenVersion + 1,
        }),
      });
    } catch (error) {
      console.error("Failed to delete day-of dashboard account", error);
      return res.status(500).json({ message: "Failed to delete account" });
    }
  },
];
