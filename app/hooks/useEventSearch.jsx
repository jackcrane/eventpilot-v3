import useSWR from "swr";
import { authFetch } from "../util/url";

const searchFetcher = async (url) => {
  const res = await authFetch(url);
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const message = payload?.error || payload?.message || "Search request failed";
    throw new Error(message);
  }
  return res.json();
};

export const useEventSearch = ({ eventId, query }) => {
  const trimmedQuery = query?.trim() ?? "";
  const key = eventId && trimmedQuery ? `/api/events/${eventId}/search?q=${encodeURIComponent(trimmedQuery)}` : null;

  const { data, error, isLoading, mutate } = useSWR(key, searchFetcher, {
    keepPreviousData: true,
  });

  return {
    results: Array.isArray(data) ? data : [],
    loading: Boolean(trimmedQuery) && isLoading,
    error,
    refetch: mutate,
  };
};
