import useSWR, { useSWRConfig } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useCrmLedger = ({ eventId, personId }) => {
  const key = personId
    ? `/api/events/${eventId}/crm/person/${personId}/ledger`
    : null;
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR(key, fetcher);

  const refetch = () => (key ? mutate(key) : undefined);

  return {
    ledgerItems: data?.ledgerItems ?? [],
    lifetimeValue: data?.lifetimeValue ?? 0,
    loading: isLoading,
    error,
    refetch,
  };
};
