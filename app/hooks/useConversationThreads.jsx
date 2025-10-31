import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";
import toast from "react-hot-toast";
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
  const { mutate } = useSWRConfig();
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

  // Mutation: load older messages window (1 week before oldest saved)
  const backfillKey = eventId
    ? `/api/events/${eventId}/conversations/v2/load-older`
    : null;
  const { trigger: triggerBackfill, isMutating: isBackfilling } = useSWRMutation(
    backfillKey,
    async (url) => {
      const res = await authFetch(url, { method: "POST" });
      if (!res.ok) {
        const msg = await res.text().catch(() => "Failed to load older messages");
        throw new Error(msg || "Failed to load older messages");
      }
      return res.json();
    }
  );

  const loadOlder = async () => {
    if (!backfillKey) return false;
    try {
      const p = triggerBackfill();
      await toast.promise(p, {
        loading: "Loading older messages...",
        success: (d) => `Loaded ${Number(d?.processed || 0)} messages`,
        error: (e) => e?.message || "Failed to load older messages",
      });
      if (key) await mutate(key);
      return true;
    } catch {
      return false;
    }
  };

  return {
    threads: data?.threads || [],
    nextPageToken: data?.nextPageToken || null,
    resultSizeEstimate: data?.resultSizeEstimate || 0,
    loading: isLoading,
    error,
    refetch: () => (key ? mutate(key) : undefined),
    loadOlder,
    mutationLoading: isBackfilling,
  };
};
