import useSWR from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) =>
  authFetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to fetch campaign stats");
    }
    return res.json();
  });

export const useCampaignStats = ({ eventId, campaignId } = {}) => {
  const key = eventId && campaignId
    ? `/api/events/${eventId}/campaigns/${campaignId}/stats`
    : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher);

  return {
    stats: data?.stats ?? null,
    loading: isLoading,
    error,
    refetch: mutate,
  };
};
