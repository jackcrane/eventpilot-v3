import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useEvent = ({ eventId }) => {
  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(`/api/events/${eventId}`, fetcher);

  return {
    event: data?.event,
    loading: isLoading,
    error,
    refetch,
  };
};
