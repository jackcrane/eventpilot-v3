import { useMemo } from "react";
import useSWR from "swr";

import { dayOfAuthFetch, dayOfJson } from "../utils/apiClient";
import { useDayOfSessionContext } from "../contexts/DayOfSessionContext";

const fetchParticipantRoster = async ([url, token, instanceId]) => {
  const response = await dayOfAuthFetch(
    url,
    { token, instanceId },
    { method: "GET" }
  );
  return dayOfJson(response);
};

const displayValue = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value.map((entry) => displayValue(entry)).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    if (value.label) return displayValue(value.label);
    return Object.values(value)
      .map((entry) => displayValue(entry))
      .filter(Boolean)
      .join(", ");
  }
  return "";
};

export const useParticipantRoster = () => {
  const { account, token } = useDayOfSessionContext();

  const key = useMemo(() => {
    if (!account?.eventId || !token) return null;
    return [
      `/api/events/${account.eventId}/registration`,
      token,
      account.instanceId ?? null,
    ];
  }, [account?.eventId, account?.instanceId, token]);

  const {
    data,
    isLoading,
    error,
    mutate,
  } = useSWR(key, fetchParticipantRoster, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });

  const fields = data?.fields ?? [];
  const registrations = data?.registrations ?? [];

  const nameFieldId = useMemo(
    () =>
      fields.find((field) => field.fieldType === "participantName")?.id ??
      fields.find((field) => (field.label || "").toLowerCase().includes("name"))
        ?.id ?? null,
    [fields]
  );

  const emailFieldId = useMemo(
    () =>
      fields.find((field) => field.fieldType === "participantEmail")?.id ??
      fields.find((field) => (field.type || "").toLowerCase() === "email")?.id ??
      null,
    [fields]
  );

  const phoneFieldId = useMemo(
    () =>
      fields.find((field) => field.fieldType === "participantPhone")?.id ??
      fields.find((field) => (field.label || "").toLowerCase().includes("phone"))
        ?.id ?? null,
    [fields]
  );

  const participants = useMemo(() => {
    if (!registrations.length) return [];

    return registrations.map((registration) => {
      const resolved = registration.resolvedResponses || {};
      const raw = registration.responses || {};

      const name = registration.flat?.name
        || displayValue(resolved[nameFieldId])
        || displayValue(raw[nameFieldId]);
      const email = registration.flat?.email
        || displayValue(resolved[emailFieldId])
        || displayValue(raw[emailFieldId]);
      const phone = registration.flat?.phone
        || displayValue(resolved[phoneFieldId])
        || displayValue(raw[phoneFieldId]);

      const tokens = [registration.searchText]
        .concat([registration.id, name, email, phone])
        .filter(Boolean)
        .map((token) => token.toString().toLowerCase());

      return {
        id: registration.id,
        createdAt: registration.createdAt,
        updatedAt: registration.updatedAt,
        finalized: registration.finalized,
        checkedInAt: registration.checkedInAt,
        checkedInBy: registration.checkedInBy,
        name: name?.trim()?.length ? name : "",
        email: email?.trim()?.length ? email : "",
        phone: phone?.trim()?.length ? phone : "",
        responses: resolved,
        rawResponses: raw,
        searchText: Array.from(new Set(tokens)).join(" \n"),
      };
    });
  }, [registrations, nameFieldId, emailFieldId, phoneFieldId]);

  return {
    fields,
    participants,
    loading: isLoading,
    error,
    refetch: mutate,
  };
};
