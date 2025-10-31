import { prisma } from "#prisma";
import { serializeError } from "#serializeError";
import {
  derivePinLookupKey,
  normalizePermissions,
  signDayOfDashboardJwt,
  verifyPin,
} from "#util/dayOfDashboard.js";
import { reportApiError } from "#util/reportApiError.js";
import { z } from "zod";

const loginSchema = z.object({
  pin: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/u, "PIN must be a 6-digit code"),
  name: z
    .string()
    .trim()
    .min(1, "Name must have at least 1 character")
    .max(160, "Name must be 160 characters or fewer")
    .optional()
    .nullable(),
});

const accountSelect = {
  id: true,
  eventId: true,
  provisionerId: true,
  instanceId: true,
  name: true,
  permissions: true,
  tokenVersion: true,
  lastIssuedAt: true,
  deleted: true,
  createdAt: true,
  updatedAt: true,
  event: {
    select: {
      name: true,
    },
  },
  provisioner: {
    select: {
      stripeLocation: {
        select: {
          stripeLocationId: true,
        },
      },
    },
  },
};

export const post = async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ message: serializeError(parseResult) });
  }

  const { pin, name } = parseResult.data;

  const lookupKey = derivePinLookupKey(pin);

  const provisioner = await prisma.dayOfDashboardProvisioner.findUnique({
    where: { pinLookupKey: lookupKey },
    select: {
      id: true,
      eventId: true,
      instanceId: true,
      permissions: true,
      jwtExpiresInSeconds: true,
      tokenVersion: true,
      deleted: true,
      pinHash: true,
    },
  });

  if (!provisioner || provisioner.deleted) {
    return res.status(401).json({ message: "Invalid or expired PIN" });
  }

  const matches = await verifyPin(pin, provisioner.pinHash);
  if (!matches) {
    return res.status(401).json({ message: "Invalid or expired PIN" });
  }

  const permissions = normalizePermissions(provisioner.permissions);
  if (!permissions.length) {
    return res.status(403).json({ message: "Provisioner has no permissions" });
  }

  try {
    const now = new Date();

    const account = await prisma.dayOfDashboardAccount.create({
      data: {
        eventId: provisioner.eventId,
        provisionerId: provisioner.id,
        instanceId: provisioner.instanceId,
        name: name?.trim() || null,
        permissions,
        lastIssuedAt: now,
      },
      select: accountSelect,
    });

    const { token, expiresAt } = signDayOfDashboardJwt({
      accountId: account.id,
      provisionerId: provisioner.id,
      eventId: provisioner.eventId,
      instanceId: account.instanceId,
      permissions: account.permissions,
      expiresInSeconds: provisioner.jwtExpiresInSeconds,
      accountTokenVersion: account.tokenVersion,
      provisionerTokenVersion: provisioner.tokenVersion,
    });

    return res.status(201).json({
      token,
      expiresAt: expiresAt.toISOString(),
      account: {
        id: account.id,
        eventId: account.eventId,
        provisionerId: account.provisionerId,
        instanceId: account.instanceId ?? null,
        name: account.name ?? null,
        permissions: account.permissions,
        tokenVersion: account.tokenVersion,
        lastIssuedAt: account.lastIssuedAt?.toISOString() ?? null,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
        defaultTerminalLocationId:
          account.provisioner?.stripeLocation?.stripeLocationId ?? null,
        eventName: account.event?.name ?? null,
      },
      provisioner: {
        id: provisioner.id,
        eventId: provisioner.eventId,
        instanceId: provisioner.instanceId ?? null,
        permissions,
        jwtExpiresInSeconds: provisioner.jwtExpiresInSeconds,
        tokenVersion: provisioner.tokenVersion,
      },
    });
  } catch (error) {
    console.error("Failed to login day-of dashboard account", error);
    reportApiError(error, req);
    return res.status(500).json({ message: "Failed to create dashboard session" });
  }
};
