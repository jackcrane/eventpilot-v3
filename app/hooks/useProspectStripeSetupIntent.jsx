import useSWR from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

// Fetches a temporary Stripe customer + setup intent for billing during the
// new event wizard, before the event exists.
export const useProspectStripeSetupIntent = () => {
  const key = "/api/events/prospect/payment/setup";
  const { data, error, isLoading, mutate: refetch } = useSWR(key, fetcher);

  return {
    customerId: data?.customerId,
    intent: data?.intent,
    customer_session: data?.customer_session,
    loading: isLoading,
    error,
    refetch,
  };
};

