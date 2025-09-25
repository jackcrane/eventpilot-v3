import useSWR from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((res) => res.json());

export const useCampaign = ({ eventId, campaignId } = {}) => {
  const key =
    eventId && campaignId
      ? `/api/events/${eventId}/campaigns/${campaignId}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher);

  return {
    campaign: data?.campaign ?? null,
    loading: isLoading,
    error,
    refetch: mutate,
  };
};

export default useCampaign;
