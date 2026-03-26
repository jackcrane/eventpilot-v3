import useSWR from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useEventStripeSetupIntent = ({ eventId }) => {
  const key = eventId ? `/api/events/${eventId}/payment/setup` : null;
  const { data, error, isLoading, mutate: refetch } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    shouldRetryOnError: false,
  });

  return {
    intent: data?.intent,
    customer_session: data?.customer_session,
    loading: isLoading,
    error,
    refetch,
  };
};
