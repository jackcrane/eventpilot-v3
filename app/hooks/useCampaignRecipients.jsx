import { useCallback, useState } from "react";
import useSWR from "swr";
import { toast } from "react-hot-toast";
import { authFetch } from "../util/url";

const fetcher = async (url) => {
  const response = await authFetch(url);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || "Failed to fetch campaign recipients");
  }
  return json;
};

const buildKey = ({
  eventId,
  campaignId,
  page,
  size,
  sortBy,
  sortDirection,
  search,
  status,
}) => {
  if (!eventId || !campaignId) return null;
  const params = new URLSearchParams();
  if (Number.isFinite(page) && page > 0) {
    params.set("page", String(page));
  }
  if (Number.isFinite(size) && size > 0) {
    params.set("size", String(size));
  }
  if (typeof sortBy === "string" && sortBy.length) {
    params.set("sortBy", sortBy);
  }
  if (typeof sortDirection === "string" && sortDirection.length) {
    params.set("sortDirection", sortDirection);
  }
  const trimmedSearch = typeof search === "string" ? search.trim() : "";
  if (trimmedSearch) {
    params.set("q", trimmedSearch);
  }
  const statusValues = Array.isArray(status)
    ? status.filter(Boolean)
    : status
    ? [status]
    : [];
  if (statusValues.length) {
    params.set("status", statusValues.join(","));
  }
  const query = params.toString();
  const base = `/api/events/${eventId}/campaigns/${campaignId}/emails`;
  return query ? `${base}?${query}` : base;
};

export const useCampaignRecipients = (
  {
    eventId,
    campaignId,
    page = 1,
    size = 25,
    sortBy,
    sortDirection,
    search,
    status,
  } = {}
) => {
  const key = buildKey({
    eventId,
    campaignId,
    page,
    size,
    sortBy,
    sortDirection,
    search,
    status,
  });
  const { data, error, isLoading, mutate } = useSWR(key, fetcher);

  const meta = data?.meta || {
    page,
    size,
    totalItems: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
    sortBy,
    sortDirection,
  };

  const [resendingEmailId, setResendingEmailId] = useState(null);

  const resendEmail = useCallback(
    async (emailId) => {
      if (!eventId || !campaignId || !emailId) return false;

      setResendingEmailId(emailId);
      try {
        const request = async () => {
          const response = await authFetch(
            `/api/events/${eventId}/campaigns/${campaignId}/emails/${emailId}/resend`,
            { method: "post" }
          );
          const json = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(json?.message || "Failed to resend email");
          }
          return json;
        };

        await toast.promise(request(), {
          loading: "Resending email...",
          success: "Email resent",
          error: (err) => err?.message || "Failed to resend email",
        });

        await mutate();
        return true;
      } catch (error) {
        return false;
      } finally {
        setResendingEmailId(null);
      }
    },
    [campaignId, eventId, mutate]
  );

  return {
    recipients: data?.emails ?? [],
    meta,
    loading: isLoading,
    error,
    refetch: mutate,
    resendEmail,
    resendingEmailId,
    mutationLoading: resendingEmailId !== null,
  };
};
