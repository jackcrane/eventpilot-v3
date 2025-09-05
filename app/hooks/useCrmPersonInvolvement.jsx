import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

// Returns involvement grouped by instance for a CRM person
// Shape: { involvement: [{ instance: {id,name}, volunteer: {shiftCount, registrations: [...]}, participant: { registrations: [...] } }] }
export const useCrmPersonInvolvement = ({ eventId, personId }) => {
  const key = personId
    ? `/api/events/${eventId}/crm/person/${personId}/involvement`
    : null;
  const { data, error, isLoading } = useSWR(key, fetcher);

  return {
    involvement: data?.involvement ?? [],
    loading: isLoading,
    error,
    refetch: () => (key ? mutate(key) : undefined),
  };
};

