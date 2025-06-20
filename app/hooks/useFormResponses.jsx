// /app/hooks/useFormResponses.jsx

import useSWR from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) =>
  authFetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch form responses");
    return res.json();
  });

/**
 * Fetches the flattened form responses for a given event.
 * @param {string} eventId    – slug or ID of the event
 * @returns {{ responses: Array<Object>, loading: boolean, error: any }}
 */
export const useFormResponses = (eventId) => {
  const key = eventId ? `/api/events/${eventId}/submission` : null;

  const { data, error, isLoading } = useSWR(key, fetcher);

  return {
    responses: data?.responses ?? [],
    fields: data?.fields ?? [],
    loading: isLoading,
    error,
  };
};
