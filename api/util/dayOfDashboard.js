import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const PIN_LENGTH = 6;
const PIN_CHARSET = "0123456789";
const SALT_ROUNDS = 12;

export const generateDashboardPin = () => {
  let pin = "";
  for (let i = 0; i < PIN_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * PIN_CHARSET.length);
    pin += PIN_CHARSET.charAt(index);
  }
  return pin;
};

export const derivePinLookupKey = (pin) =>
  crypto.createHash("sha256").update(pin).digest("hex");

export const normalizePermissions = (permissions = []) =>
  Array.from(
    new Set(
      (permissions || [])
        .map((permission) => `${permission}`.trim())
        .filter((permission) => permission.length)
    )
  ).sort();

export const hashPin = async (pin) => bcrypt.hash(pin, SALT_ROUNDS);

export const verifyPin = async (pin, hash) => bcrypt.compare(pin, hash);

export const signDayOfDashboardJwt = ({
  accountId,
  provisionerId,
  eventId,
  instanceId,
  permissions,
  expiresInSeconds,
  accountTokenVersion,
  provisionerTokenVersion,
}) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const payload = {
    type: "DAY_OF_DASHBOARD",
    aid: accountId,
    pid: provisionerId,
    eid: eventId,
    iid: instanceId ?? null,
    perms: permissions,
    atv: accountTokenVersion,
    ptv: provisionerTokenVersion,
    dayOf: true,
  };

  const expiresIn = Math.max(60, Number(expiresInSeconds) || 3600);
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn,
  });

  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  return { token, expiresAt };
};
