import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import { useState } from "react";
import toast from "react-hot-toast";
const fetcher = (url) => authFetch(url).then((r) => r.json());
export const useConversations = ({ eventId }) => {
  const key = `/api/events/${eventId}/conversations`;
  const { data, error, isLoading } = useSWR(key, fetcher);
  const [mutationLoading, setMutationLoading] = useState(false);

  const createConversation = async (data) => {
    setMutationLoading(true);
    try {
      const promise = authFetch(key, {
        method: "POST",
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Creating...",
        success: "Created successfully",
        error: "Error",
      });

      await mutate(key);
      return true;
    } catch {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };
  return {
    conversations: data?.conversations,
    loading: isLoading,
    mutationLoading,
    error,
    refetch: () => mutate(key),
    createConversation,
  };
};
