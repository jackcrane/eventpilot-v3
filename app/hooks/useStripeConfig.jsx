import useSWRImmutable from "swr/immutable";
import { publicFetch } from "../util/url";

const key = "/api/stripe/config";

const fetcher = async (url) => {
  const response = await publicFetch(url);
  if (!response.ok) {
    throw new Error("Failed to load Stripe config");
  }
  return response.json();
};

export const useStripeConfig = () => {
  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWRImmutable(key, fetcher);

  return {
    publishableKey: data?.stripe?.publishableKey,
    loading: isLoading,
    error,
    refetch,
  };
};
