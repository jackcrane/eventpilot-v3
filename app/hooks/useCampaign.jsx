import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useCampaign = ({ eventId, campaignId }) => {
  console.trace("useCampaign was used. This is deprecated.");
  return null;

  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(`/api/events/${eventId}/campaigns/${campaignId}`, fetcher);

  return {
    campaign: data?.campaign,
    loading: isLoading,
    error,
    refetch,
  };
};
