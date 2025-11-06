import useSWR, { useSWRConfig } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useUserProgress = () => {
  const key = `/api/auth/me/dash`;
  const { mutate } = useSWRConfig();

  const { data, error, isLoading } = useSWR(key, fetcher);

  return {
    steps: data?.steps,
    loading: isLoading,
    error,
    refetch: () => mutate(key),
  };
};
