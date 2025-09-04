import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useDashLedger = ({ eventId }) => {
  const key = eventId ? `/api/events/${eventId}/dash/ledger` : null;
  const { data, error, isLoading } = useSWR(key, fetcher);

  return {
    ledgerTotal: data?.ledgerTotal ?? 0,
    trend: data?.trend || null,
    loading: isLoading,
    error,
    refetch: () => (key ? mutate(key) : undefined),
  };
};

