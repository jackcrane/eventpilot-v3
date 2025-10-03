import { prisma } from "#prisma";
import { verifyAuth } from "#verifyAuth";
import { serializeError } from "#serializeError";
import { z } from "zod";
import { normalizePermissions } from "#util/dayOfDashboard.js";
import { accountSelect, formatAccount } from "./shared.js";

const createAccountSchema = z.object({
  provisionerId: z.string().cuid(),
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
});

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const includeDeleted = req.query.includeDeleted === "true";
    const provisionerId = req.query.provisionerId?.toString();

    try {
      const accounts = await prisma.dayOfDashboardAccount.findMany({
        where: {
          eventId,
          deleted: includeDeleted ? undefined : false,
          ...(provisionerId ? { provisionerId } : {}),
        },
        select: accountSelect,
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        accounts: accounts.map((account) => formatAccount(account)),
      });
    } catch (error) {
      console.error("Failed to fetch day-of dashboard accounts", error);
      reportApiError(error, req);
      return res.status(500).json({ message: "Failed to fetch accounts" });
    }
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId } = req.params;
    const parseResult = createAccountSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({ message: serializeError(parseResult) });
    }

    const { provisionerId, name, instanceId, permissions } = parseResult.data;

    const provisioner = await prisma.dayOfDashboardProvisioner.findFirst({
      where: { id: provisionerId, eventId },
      select: {
        id: true,
        permissions: true,
        instanceId: true,
        deleted: true,
      },
    });

    if (!provisioner || provisioner.deleted) {
      return res.status(400).json({ message: "Invalid provisioner" });
    }

    let resolvedInstanceId = provisioner.instanceId ?? null;
    if (Object.prototype.hasOwnProperty.call(parseResult.data, "instanceId")) {
      if (instanceId === null) {
        resolvedInstanceId = null;
      } else if (instanceId) {
        const instance = await prisma.eventInstance.findFirst({
          where: { id: instanceId, eventId },
          select: { id: true },
        });
        if (!instance) {
          return res.status(400).json({ message: "Invalid instance" });
        }
        resolvedInstanceId = instance.id;
      }
    }

    const normalizedPermissions = permissions
      ? normalizePermissions(permissions)
      : normalizePermissions(provisioner.permissions);

    if (!normalizedPermissions.length) {
      return res.status(400).json({ message: "At least one permission required" });
    }

    try {
      const account = await prisma.dayOfDashboardAccount.create({
        data: {
          eventId,
          provisionerId,
          instanceId: resolvedInstanceId,
          name: name?.trim() || null,
          permissions: normalizedPermissions,
        },
        select: accountSelect,
      });

      return res.status(201).json({ account: formatAccount(account) });
    } catch (error) {
      console.error("Failed to create day-of dashboard account", error);
      reportApiError(error, req);
      return res.status(500).json({ message: "Failed to create account" });
    }
  },
];
