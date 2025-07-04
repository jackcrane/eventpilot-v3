import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
const fetcher = (url) => authFetch(url).then((r) => r.json());
export const useConversations = ({ eventId }) => {
  const key = `/api/events/${eventId}/conversations`;
  const { data, error, isLoading } = useSWR(key, fetcher);
  return {
    conversations: data?.conversations,
    loading: isLoading,
    error,
    refetch: () => mutate(key),
  };
};