import useSWR from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

// Read-only list of sessions for an event
// Returns { sessions, loading, error, refetch }
export const useSessions = ({ eventId }) => {
  const key = eventId ? `/api/events/${eventId}/sessions` : null;

  const { data, error, isLoading, mutate: refetch } = useSWR(key, fetcher);

  return {
    sessions: data?.sessions,
    loading: isLoading,
    error,
    refetch,
  };
};

