import useSWR from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";

const fetcher = (url) => authFetch(url).then((r) => r.json());

// useCampaigns: lists campaigns for an event and exposes createCampaign
export const useCampaigns = ({ eventId }) => {
  const key = eventId ? `/api/events/${eventId}/campaigns` : null;
  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(key, fetcher);

  const createCampaign = async ({ name, from, subject, body, crmPersonIds }) => {
    try {
      const promise = authFetch(`/api/events/${eventId}/campaigns`, {
        method: "POST",
        body: JSON.stringify({ name, from, subject, body, crmPersonIds }),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      const response = await toast.promise(promise, {
        loading: "Creating campaign…",
        success: "Campaign created",
        error: "Error creating campaign",
      });

      await refetch();

      return response; // { campaign, enqueued, skipped }
    } catch (e) {
      return false;
    }
  };

  const processQueue = async ({ campaignId, limit } = {}) => {
    try {
      const promise = authFetch(`/api/events/${eventId}/campaigns`, {
        method: "PATCH",
        body: JSON.stringify({ campaignId, limit }),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      const response = await toast.promise(promise, {
        loading: "Processing campaign queue…",
        success: "Queue processed",
        error: "Error processing queue",
      });

      await refetch();
      return response; // { processedThisCall, pending, processing, sent }
    } catch (e) {
      return false;
    }
  };

  return {
    campaigns: data?.campaigns,
    loading: isLoading,
    error,
    refetch,
    createCampaign,
    processQueue,
  };
};
