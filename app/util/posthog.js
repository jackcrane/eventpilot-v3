import posthog from "posthog-js";

const POSTHOG_ALIAS_KEY = "posthog_last_aliased_user_id";
const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;

export const posthogEnabled = Boolean(
  POSTHOG_KEY && import.meta.env.VITE_PUBLIC_POSTHOG_HOST
);

export const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: "2026-01-30",
  capture_pageview: false,
};

export const posthogApiKey = POSTHOG_KEY;

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
        .filter(([, nestedValue]) => nestedValue !== undefined)
    );
  }

  return value;
};

const getEmailDomain = (email) => {
  if (typeof email !== "string") {
    return null;
  }

  return email.includes("@") ? email.split("@").pop() : null;
};

const getUserProperties = (user) =>
  compactProperties({
    email: user?.email,
    email_domain: getEmailDomain(user?.email),
    name: user?.name,
    account_type: user?.accountType,
    email_verified: user?.emailVerified,
    phone_number_present: Boolean(user?.phoneNumber),
    good_standing: user?.goodStanding,
  });

export const capturePosthogEvent = (eventName, properties = {}) => {
  if (!posthogEnabled) {
    return;
  }

  try {
    posthog.capture(
      eventName,
      compactProperties({
        capture_source: "client",
        ...properties,
      })
    );
  } catch (error) {
    console.warn("[posthog] Failed to capture client event", eventName, error);
  }
};

export const syncPosthogUser = (user) => {
  if (!posthogEnabled || !user?.id) {
    return;
  }

  try {
    const currentDistinctId = posthog.get_distinct_id?.();
    const lastAliasedUserId = localStorage.getItem(POSTHOG_ALIAS_KEY);

    if (
      currentDistinctId &&
      currentDistinctId !== user.id &&
      lastAliasedUserId !== user.id
    ) {
      posthog.alias(user.id, currentDistinctId);
      localStorage.setItem(POSTHOG_ALIAS_KEY, user.id);
    }

    posthog.identify(user.id, getUserProperties(user));
    posthog.register(
      compactProperties({
        user_id: user.id,
        account_type: user.accountType,
      })
    );
  } catch (error) {
    console.warn("[posthog] Failed to sync user", error);
  }
};

export const resetPosthogUser = () => {
  if (!posthogEnabled) {
    return;
  }

  try {
    posthog.reset();
    localStorage.removeItem(POSTHOG_ALIAS_KEY);
  } catch (error) {
    console.warn("[posthog] Failed to reset user", error);
  }
};

export const setPosthogGroups = ({ eventId = null, instanceId = null } = {}) => {
  if (!posthogEnabled) {
    return;
  }

  try {
    posthog.resetGroups();

    if (eventId) {
      posthog.group("event", eventId, { event_id: eventId });
    }

    if (instanceId) {
      posthog.group("instance", instanceId, {
        event_id: eventId,
        instance_id: instanceId,
      });
    }

    if (eventId) {
      posthog.register({ event_id: eventId });
    } else {
      posthog.unregister("event_id");
    }

    if (instanceId) {
      posthog.register({ instance_id: instanceId });
    } else {
      posthog.unregister("instance_id");
    }
  } catch (error) {
    console.warn("[posthog] Failed to set groups", error);
  }
};
