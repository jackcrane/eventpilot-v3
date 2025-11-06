import useSWR from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useStripeSetupIntent = () => {
  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(`/api/auth/me/payment/setup`, fetcher);

  return {
    intent: data?.intent,
    customer_session: data?.customer_session,
    loading: isLoading,
    error,
    refetch,
  };
};
