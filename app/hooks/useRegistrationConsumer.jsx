import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useRegistrationConsumer = ({ eventId }) => {
  const key = `/api/events/${eventId}/registration/consumer`;
  const { data, error, isLoading } = useSWR(key, fetcher);

  return {
    tiers: data?.tiers,
    fields: data?.fields,
    loading: isLoading,
    error,
    refetch: () => mutate(key),
  };
};
