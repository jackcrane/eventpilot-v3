import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import toast from "react-hot-toast";
import { authFetch } from "../util/url";

const fetcher = async (url) => {
  const response = await authFetch(url);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "Failed to load Stripe addresses");
  }
  return payload;
};

const createFetcher = async (url, { arg }) => {
  const response = await authFetch(url, {
    method: "POST",
    body: JSON.stringify(arg),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.message || "Failed to create address";
    throw new Error(message);
  }
  return payload;
};

export const useStripeLocations = ({ eventId }) => {
  const key = eventId ? `/api/events/${eventId}/stripe/locations` : null;
  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR(key, fetcher);

  const { trigger, isMutating } = useSWRMutation(key, createFetcher);

  const createLocation = async (input) => {
    if (!key) return null;
    const promise = trigger(input);
    const result = await toast.promise(promise, {
      loading: "Adding address…",
      success: "Stripe address saved",
      error: (err) => err?.message || "Failed to save address",
    });
    await mutate();
    return result?.location ?? null;
  };

  return {
    locations: data?.locations ?? [],
    defaultStripeTerminalLocationId:
      data?.defaultStripeTerminalLocationId ?? null,
    loading: Boolean(key) && isLoading,
    error,
    createLocation,
    creating: isMutating,
    refetch: mutate,
  };
};
