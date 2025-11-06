import useSWR, { useSWRConfig } from "swr";
import { authFetch } from "../util/url";
const fetcher = (url) => authFetch(url).then((r) => r.json());
export const useRegistrations = ({ eventId }) => {
  const key = `/api/events/${eventId}/registration`;
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR(key, fetcher);
  return {
    registrations: data?.registrations,
    fields: data?.fields,
    loading: isLoading,
    error,
    refetch: () => mutate(key),
  };
};
