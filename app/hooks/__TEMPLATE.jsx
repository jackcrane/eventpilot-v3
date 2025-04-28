import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useEmailPreferences = () => {
  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(`/api/auth/me/email`, fetcher);

  return {
    emailPreferences: data?.emailPreferences,
    loading: isLoading,
    error,
    refetch,
  };
};
