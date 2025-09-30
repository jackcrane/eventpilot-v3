import { useCallback, useMemo, useState } from "react";
import useSWR, { mutate as mutateGlobal } from "swr";
import toast from "react-hot-toast";
import { authFetch } from "../util/url";
import { useSelectedInstance } from "../contexts/SelectedInstanceContext";

const MIN_EXPIRY_SECONDS = 60;
const MAX_EXPIRY_SECONDS = 60 * 60 * 24 * 7;

const fetcher = async (url) => {
  const response = await authFetch(url);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || "Failed to load provisioners");
  }

  return payload;
};

const clampExpirySeconds = (seconds) => {
  if (!Number.isFinite(seconds)) return undefined;
  const clamped = Math.min(Math.max(Math.round(seconds), MIN_EXPIRY_SECONDS), MAX_EXPIRY_SECONDS);
  return clamped;
};

const computeExpirySeconds = (iso) => {
  if (!iso) return undefined;
  const milliseconds = Date.parse(iso);
  if (Number.isNaN(milliseconds)) return undefined;
  const diffSeconds = (milliseconds - Date.now()) / 1000;
  return clampExpirySeconds(diffSeconds);
};

export const PROVISIONER_PERMISSION_OPTIONS = [
  { value: "VOLUNTEER_CHECK_IN", label: "Volunteer check-in" },
  {
    value: "PARTICIPANT_CHECK_IN",
    label: "Participant check-in/registration",
  },
  { value: "POINT_OF_SALE", label: "Point of sale" },
];

export const useDayOfProvisioners = ({ eventId }) => {
  const { instance, instanceDropdownValue } = useSelectedInstance();
  const selectedInstanceId = instance?.id || instanceDropdownValue?.id || null;

  const key = useMemo(() => {
    if (!eventId) return null;
    return `/api/events/${eventId}/day-of-dashboard/provisioners`;
  }, [eventId]);

  const {
    data,
    error,
    isLoading,
    mutate: mutateProvisioners,
  } = useSWR(key, fetcher);
  const [mutationLoading, setMutationLoading] = useState(false);

  const provisioners = data?.provisioners ?? [];

  const invalidateAccountCaches = useCallback(() => {
    if (!eventId) return Promise.resolve([]);
    const base = `/api/events/${eventId}/day-of-dashboard/accounts`;
    return mutateGlobal((key) => typeof key === "string" && key.startsWith(base));
  }, [eventId]);

  const createProvisioner = useCallback(
    async ({ name, permissions, expiryIso }) => {
      if (!eventId) return { success: false };
      const expiresIn = computeExpirySeconds(expiryIso);

      setMutationLoading(true);
      try {
        const promise = authFetch(
          `/api/events/${eventId}/day-of-dashboard/provisioners`,
          {
            method: "POST",
            body: JSON.stringify({
              name: name?.trim() || null,
              permissions: permissions || [],
              jwtExpiresInSeconds: expiresIn,
              instanceId: selectedInstanceId,
            }),
          }
        ).then(async (response) => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.message || "Failed to create provisioner");
          }
          return payload;
        });

        const result = await toast.promise(promise, {
          loading: "Creating provisioner...",
          success: "Provisioner created",
          error: (err) => err?.message || "Failed to create provisioner",
        });

        await mutateProvisioners();
        await invalidateAccountCaches();
        return { success: true, ...result };
      } catch (errorCaught) {
        console.error("Failed to create provisioner", errorCaught);
        return { success: false, error: errorCaught };
      } finally {
        setMutationLoading(false);
      }
    },
    [eventId, invalidateAccountCaches, mutateProvisioners, selectedInstanceId]
  );

  const updateProvisioner = useCallback(
    async (provisionerId, updates) => {
      if (!eventId || !provisionerId) return false;
      const payload = {};

      if (Object.prototype.hasOwnProperty.call(updates, "name")) {
        payload.name = updates.name?.trim() || null;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "permissions")) {
        payload.permissions = updates.permissions || [];
      }

      setMutationLoading(true);
      try {
        const promise = authFetch(
          `/api/events/${eventId}/day-of-dashboard/provisioners/${provisionerId}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        ).then(async (response) => {
          const body = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(body?.message || "Failed to update provisioner");
          }
          return body;
        });

        await toast.promise(promise, {
          loading: "Saving changes...",
          success: "Provisioner updated",
          error: (err) => err?.message || "Failed to update provisioner",
        });

        await mutateProvisioners();
        await invalidateAccountCaches();
        return true;
      } catch (errorCaught) {
        console.error("Failed to update provisioner", errorCaught);
        return false;
      } finally {
        setMutationLoading(false);
      }
    },
    [eventId, invalidateAccountCaches, mutateProvisioners]
  );

  const endProvisionerSessions = useCallback(
    async (provisionerId) => {
      if (!eventId || !provisionerId) return { success: false };

      setMutationLoading(true);
      try {
        const promise = authFetch(
          `/api/events/${eventId}/day-of-dashboard/provisioners/${provisionerId}/end-sessions`,
          {
            method: "POST",
          }
        ).then(async (response) => {
          const body = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(body?.message || "Failed to end sessions");
          }
          return body;
        });

        await toast.promise(promise, {
          loading: "Ending sessions...",
          success: "All sessions ended",
          error: (err) => err?.message || "Failed to end sessions",
        });

        await mutateProvisioners();
        await invalidateAccountCaches();
        return { success: true };
      } catch (errorCaught) {
        console.error("Failed to end provisioner sessions", errorCaught);
        return { success: false, error: errorCaught };
      } finally {
        setMutationLoading(false);
      }
    },
    [eventId, invalidateAccountCaches, mutateProvisioners]
  );

  return {
    provisioners,
    loading: Boolean(eventId) && (isLoading || mutationLoading),
    mutationLoading,
    error,
    refetch: mutateProvisioners,
    createProvisioner,
    updateProvisioner,
    endProvisionerSessions,
  };
};
