// /app/hooks/useFormResponses.jsx

import useSWR from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) =>
  authFetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch form responses");
    return res.json();
  });

/**
 * Fetches the flattened form responses for a given event + campaign.
 * @param {string} eventId    – slug or ID of the event
 * @param {string} campaignId – slug or ID of the campaign
 * @returns {{ responses: Array<Object>, loading: boolean, error: any }}
 */
export const useFormResponses = (eventId, campaignId) => {
  const key =
    eventId && campaignId
      ? `/api/events/${eventId}/campaigns/${campaignId}/submission`
      : null;

  const { data, error, isLoading } = useSWR(key, fetcher);

  return {
    responses: data?.responses ?? [],
    fields: data?.fields ?? [],
    loading: isLoading,
    error,
  };
};
