import useSWR from "swr";
import { publicFetch } from "../util/url";

const fetcher = async ([url, token]) => {
  const res = await publicFetch(`${url}?token=${encodeURIComponent(token)}`);
  const json = await res.json();

  if (!res.ok) {
    const error = new Error("Failed to validate token");
    error.info = json;
    throw error;
  }

  return json;
};

export const useForgotPasswordToken = (token) => {
  const key = token ? ["/api/auth/reset-password", token] : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    shouldRetryOnError: false,
  });

  const message = error?.info?.message || error?.message;

  return {
    tokenValid: Boolean(data?.valid),
    loading: Boolean(token) && isLoading,
    error: Array.isArray(message) ? message[0]?.message : message,
    refetch: () => mutate(),
  };
};

export default useForgotPasswordToken;
