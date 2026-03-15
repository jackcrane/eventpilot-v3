import { PostHog } from "posthog-node";
import dotenv from "dotenv";

dotenv.config();

const POSTHOG_KEY =
  process.env.POSTHOG_KEY || process.env.VITE_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.POSTHOG_HOST || process.env.VITE_PUBLIC_POSTHOG_HOST;

const posthog =
  process.env.NODE_ENV === "test" || !POSTHOG_KEY || !POSTHOG_HOST
    ? null
    : new PostHog(POSTHOG_KEY, {
        host: POSTHOG_HOST,
        flushAt: 1,
        flushInterval: 0,
      });

const compactProperties = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => compactProperties(item))
      .filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, nestedValue]) => [key, compactProperties(nestedValue)])
        .filter(([, nestedValue]) => nestedValue !== undefined),
    );
  }

  return value;
};

const isLocalDev =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === undefined;

const getDistinctId = (req, distinctId) =>
  distinctId ||
  req?.user?.id ||
  req?.dayOfDashboardAccount?.id ||
  (req?.id ? `request:${req.id}` : null);

const getEventId = (req, eventId) => eventId || req?.params?.eventId || null;

const getInstanceId = (req, instanceId) =>
  instanceId || req?.instanceId || req?.params?.instanceId || null;

const getUserProperties = (user) =>
  compactProperties({
    email: user?.email,
    name: user?.name,
    account_type: user?.accountType,
    email_verified: user?.emailVerified,
    phone_number_present: Boolean(user?.phoneNumber),
    suspended: user?.suspended,
  });

const withErrorLogging = async (handler) => {
  if (!posthog) {
    return;
  }

  try {
    await handler();
  } catch {
    null;
  }
};

export const identifyApiUser = async (req, properties = {}, distinctId) => {
  const resolvedDistinctId = getDistinctId(req, distinctId);

  if (!posthog || !resolvedDistinctId || !req?.user) {
    return;
  }

  await withErrorLogging(async () => {
    await posthog.identify({
      distinctId: resolvedDistinctId,
      properties: compactProperties({
        ...getUserProperties(req.user),
        app_environment: process.env.NODE_ENV || "development",
        app_runtime: "node-api",
        is_local_dev: isLocalDev,
        ...properties,
      }),
    });
  });
};

export const identifyApiGroup = async (
  req,
  { eventId, eventProperties, instanceId, instanceProperties } = {},
) => {
  if (!posthog) {
    return;
  }

  const resolvedDistinctId = getDistinctId(req);
  const resolvedEventId = getEventId(req, eventId);
  const resolvedInstanceId = getInstanceId(req, instanceId);

  if (resolvedEventId) {
    await withErrorLogging(async () => {
      await posthog.groupIdentify({
        groupType: "event",
        groupKey: resolvedEventId,
        distinctId: resolvedDistinctId,
        properties: compactProperties({
          event_id: resolvedEventId,
          app_environment: process.env.NODE_ENV || "development",
          app_runtime: "node-api",
          is_local_dev: isLocalDev,
          ...eventProperties,
        }),
      });
    });
  }

  if (resolvedInstanceId) {
    await withErrorLogging(async () => {
      await posthog.groupIdentify({
        groupType: "instance",
        groupKey: resolvedInstanceId,
        distinctId: resolvedDistinctId,
        properties: compactProperties({
          event_id: resolvedEventId,
          instance_id: resolvedInstanceId,
          app_environment: process.env.NODE_ENV || "development",
          app_runtime: "node-api",
          is_local_dev: isLocalDev,
          ...instanceProperties,
        }),
      });
    });
  }
};

export const captureApiEvent = async (
  req,
  event,
  properties = {},
  {
    eventId,
    instanceId,
    distinctId,
    identifyUser = false,
    identifyGroup = false,
  } = {},
) => {
  if (!posthog) {
    return;
  }

  const resolvedDistinctId = getDistinctId(req, distinctId);
  const resolvedEventId = getEventId(req, eventId);
  const resolvedInstanceId = getInstanceId(req, instanceId);
  const groups = Object.fromEntries(
    Object.entries({
      event: resolvedEventId,
      instance: resolvedInstanceId,
    }).filter(([, value]) => Boolean(value)),
  );

  if (identifyUser) {
    await identifyApiUser(req, {}, resolvedDistinctId);
  }

  if (identifyGroup) {
    await identifyApiGroup(req, {
      eventId: resolvedEventId,
      instanceId: resolvedInstanceId,
    });
  }

  await withErrorLogging(async () => {
    await posthog.capture({
      distinctId: resolvedDistinctId,
      event,
      properties: compactProperties({
        capture_source: "api",
        app_environment: process.env.NODE_ENV || "development",
        app_runtime: "node-api",
        is_local_dev: isLocalDev,
        request_id: req?.id,
        method: req?.method,
        route: req?.route?.path || req?.originalUrl?.split("?")[0],
        user_id: req?.user?.id,
        event_id: resolvedEventId,
        instance_id: resolvedInstanceId,
        ...properties,
      }),
      groups: Object.keys(groups).length ? groups : undefined,
    });
  });
};

export const shutdownPosthog = async () => {
  if (!posthog) {
    return;
  }

  await withErrorLogging(async () => {
    await posthog.shutdown();
  });
};
