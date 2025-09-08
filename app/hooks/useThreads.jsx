import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
const fetcher = (url) => authFetch(url).then((r) => r.json());
const fetchSchema = async ([url]) => {
  const res = await authFetch(url, {
    method: "QUERY",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch schema");
  const raw = await res.json();
  return dezerialize(raw);
};
export const useThreads = ({ eventId }) => {
  const key = `/api/events/${eventId}/conversations/v2/threads`;
  const { data, error, isLoading } = useSWR(key, fetcher);
  return {
    threads: data?.threads,
    loading: isLoading,
    error,
    refetch: () => mutate(key),
  };
};
