import useSWR from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

// Read-only hook for a single session
// Returns: { session, loading, error, refetch }
export const useSession = ({ eventId, sessionId }) => {
  const key =
    eventId && sessionId ? `/api/events/${eventId}/sessions/${sessionId}` : null;

  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(key, fetcher);

  // API returns the session object directly (not wrapped)
  return {
    session: data,
    loading: isLoading,
    error,
    refetch,
  };
};

