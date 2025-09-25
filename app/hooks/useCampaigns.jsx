import useSWR from "swr";
import toast from "react-hot-toast";
import { dezerialize } from "zodex";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((res) => res.json());

const fetchSchema = async ([url]) => {
  const res = await authFetch(url, {
    method: "QUERY",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch campaign schema");
  const raw = await res.json();
  return dezerialize(raw);
};

const parseResponse = async (res) => {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || "Request failed");
  }
  return json;
};

export const useCampaigns = ({ eventId } = {}) => {
  const key = eventId ? `/api/events/${eventId}/campaigns` : null;

  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(key, fetcher);

  const { data: schema } = useSWR(key ? [key, "schema"] : null, fetchSchema);

  const createCampaign = async (payload) => {
    if (!eventId) return null;

    try {
      const parsed = schema
        ? schema.safeParse(payload ?? {})
        : { success: true, data: payload };

      if (!parsed.success) {
        toast.error("Validation error");
        return null;
      }

      const request = authFetch(`/api/events/${eventId}/campaigns`, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      }).then(parseResponse);

      const { campaign } = await toast.promise(request, {
        loading: "Creating campaign...",
        success: "Campaign created",
        error: (err) => err?.message || "Error creating campaign",
      });

      await refetch();
      return campaign ?? null;
    } catch (error) {
      return null;
    }
  };

  const sendCampaign = async (campaignId) => {
    if (!eventId || !campaignId) return false;

    try {
      const request = authFetch(
        `/api/events/${eventId}/campaigns/${campaignId}/send`,
        { method: "POST" }
      ).then(parseResponse);

      await toast.promise(request, {
        loading: "Sending campaign...",
        success: "Campaign send simulated",
        error: (err) => err?.message || "Error sending campaign",
      });

      await refetch();
      return true;
    } catch (error) {
      return false;
    }
  };

  return {
    campaigns: data?.campaigns || [],
    schema,
    loading: isLoading,
    error,
    refetch,
    createCampaign,
    sendCampaign,
  };
};
