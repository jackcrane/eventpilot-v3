import useSWR from "swr";
import { dezerialize } from "zodex";
import { publicFetch } from "../util/url";

const key = "/api/stripe/config";

const fetcher = async (url) => {
  const response = await publicFetch(url);
  if (!response.ok) {
    throw new Error("Failed to load Stripe config");
  }
  return response.json();
};

const fetchSchema = async () => {
  const response = await publicFetch(key, {
    method: "QUERY",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    throw new Error("Failed to load Stripe config schema");
  }
  return dezerialize(await response.json());
};

export const useStripeConfig = () => {
  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(key, fetcher);
  const { data: schema, isLoading: schemaLoading } = useSWR(
    [key, "schema"],
    fetchSchema
  );

  return {
    publishableKey: data?.stripe?.publishableKey,
    loading: isLoading,
    error,
    schema,
    schemaLoading,
    refetch,
  };
};
