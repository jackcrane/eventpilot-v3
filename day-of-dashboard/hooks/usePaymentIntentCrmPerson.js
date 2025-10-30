import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";

import { useDayOfSessionContext } from "../contexts/DayOfSessionContext";
import { dayOfAuthFetch, dayOfJson } from "../utils/apiClient";

const buildKey = (eventId, paymentIntentId) => {
  if (!eventId || !paymentIntentId) {
    return null;
  }
  return `/api/events/${eventId}/day-of-dashboard/terminal/payment-intents/${paymentIntentId}/crm-person`;
};

export const usePaymentIntentCrmPerson = (paymentIntentId) => {
  const { account, token } = useDayOfSessionContext();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const eventId = account?.eventId ?? null;
  const instanceId = account?.instanceId ?? null;

  const ensureSessionReady = useCallback(() => {
    if (!eventId || !token) {
      throw new Error("Session is not ready for CRM operations");
    }
  }, [eventId, token]);

  const key = useMemo(
    () => buildKey(eventId, paymentIntentId),
    [eventId, paymentIntentId]
  );

  const fetcher = useCallback(
    async (url) => {
      ensureSessionReady();
      const response = await dayOfAuthFetch(
        url,
        { token, instanceId },
        { method: "GET" }
      );
      return dayOfJson(response);
    },
    [ensureSessionReady, instanceId, token]
  );

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const save = useCallback(
    async ({ name, email }) => {
      if (!key) {
        return { success: false, error: new Error("Missing payment intent") };
      }

      try {
        ensureSessionReady();
      } catch (sessionError) {
        return { success: false, error: sessionError };
      }

      setSaving(true);
      setSaveError(null);

      try {
        const response = await dayOfAuthFetch(
          key,
          { token, instanceId },
          {
            method: "PUT",
            body: JSON.stringify({ name, email }),
          }
        );
        const updated = await dayOfJson(response);
        await mutate(updated, { revalidate: false });
        return { success: true, data: updated };
      } catch (err) {
        setSaveError(err);
        return { success: false, error: err };
      } finally {
        setSaving(false);
      }
    },
    [ensureSessionReady, instanceId, key, mutate, token]
  );

  const refetch = useCallback(async () => {
    if (!key) {
      return null;
    }
    return mutate();
  }, [key, mutate]);

  return {
    paymentIntent: data?.paymentIntent ?? null,
    crmPerson: data?.crmPerson ?? null,
    created: Boolean(data?.created),
    loading: isLoading,
    validating: isValidating,
    error,
    save,
    saving,
    saveError,
    refetch,
  };
};
