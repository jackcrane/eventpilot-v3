import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useDashCrm = ({ eventId }) => {
  const key = eventId ? `/api/events/${eventId}/dash/crm` : null;
  const { data, error, isLoading } = useSWR(key, fetcher);

  return {
    totalCrm: data?.totalCrm ?? 0,
    loading: isLoading,
    error,
    refetch: () => (key ? mutate(key) : undefined),
  };
};

