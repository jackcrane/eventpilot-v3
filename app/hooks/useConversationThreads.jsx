import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

// Lists Gmail conversation threads for an event
// Args: { eventId, q, labelIds, pageToken, maxResults }
export const useConversationThreads = ({
  eventId,
  q,
  labelIds,
  pageToken,
  maxResults,
} = {}) => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (labelIds && String(labelIds).length) params.set("labelIds", String(labelIds));
  if (pageToken) params.set("pageToken", pageToken);
  if (maxResults) params.set("maxResults", String(maxResults));

  const key = eventId
    ? `/api/events/${eventId}/conversations/v2/threads${
        params.toString() ? `?${params.toString()}` : ""
      }`
    : null;

  const { data, error, isLoading } = useSWR(key, fetcher);

  return {
    threads: data?.threads || [],
    nextPageToken: data?.nextPageToken || null,
    resultSizeEstimate: data?.resultSizeEstimate || 0,
    loading: isLoading,
    error,
    refetch: () => (key ? mutate(key) : undefined),
  };
};

