import useSWR, { useSWRConfig } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useDashUpsellUsage = ({ eventId }) => {
  const key = eventId ? `/api/events/${eventId}/dash/upsells` : null;
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR(key, fetcher);

  return {
    total: data?.total ?? 0,
    withUpsells: data?.withUpsells ?? 0,
    percent: data?.percent ?? null,
    previous: data?.previous || null,
    loading: isLoading,
    error,
    refetch: () => (key ? mutate(key) : undefined),
  };
};
