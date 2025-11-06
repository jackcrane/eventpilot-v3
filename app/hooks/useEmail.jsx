import useSWR, { useSWRConfig } from "swr";
import { authFetch } from "../util/url";
const fetcher = (url) => authFetch(url).then((r) => r.json());
export const useEmail = ({ emailId }) => {
  const key = `/api/email/${emailId}`;
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR(key, fetcher);
  return {
    email: data?.email,
    loading: isLoading,
    error,
    refetch: () => mutate(key),
  };
};
