import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

// Fetch a single Gmail conversation thread with messages
// Args: { eventId, threadId }
export const useConversationThread = ({ eventId, threadId } = {}) => {
  const key = eventId && threadId
    ? `/api/events/${eventId}/conversations/v2/threads/${threadId}`
    : null;

  const { data, error, isLoading } = useSWR(key, fetcher);

  return {
    thread: data?.thread || null,
    messages: data?.messages || [],
    loading: isLoading,
    error,
    refetch: () => (key ? mutate(key) : undefined),
  };
};

