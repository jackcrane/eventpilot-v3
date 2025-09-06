import useSWR from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

// Read-only session detail (with chunks and events)
// Returns { session, chunks, events, loading, error, refetch }
export const useSession = ({ eventId, sessionId }) => {
  const key =
    eventId && sessionId
      ? `/api/events/${eventId}/sessions/${sessionId}`
      : null;

  const { data, error, isLoading, mutate: refetch } = useSWR(key, fetcher);

  return {
    session: data,
    loading: isLoading,
    error,
    refetch,
  };
};
