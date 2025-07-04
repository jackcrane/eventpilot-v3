import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useConfirm } from "tabler-react-2";
const fetcher = (url) => authFetch(url).then((r) => r.json());
export const useConversation = ({ eventId, conversationId }) => {
  const key = `/api/events/${eventId}/conversations/${conversationId}`;
  const { data, error, isLoading } = useSWR(key, fetcher);
  const [mutationLoading, setMutationLoading] = useState(false);
  const { confirm, ConfirmModal } = useConfirm({
    title: "Are you sure you want to delete this Conversation?",
    text: "This action cannot be undone.",
  });

  useEffect(() => {
    mutate(`/api/events/${eventId}/conversations`);
  }, [data]);

  const deleteConversation = async (onDelete) => {
    if (await confirm()) {
      setMutationLoading(true);
      try {
        const promise = authFetch(key, {
          method: "DELETE",
        }).then(async (r) => {
          if (!r.ok) throw new Error("Request failed");
          return r.json();
        });

        await toast.promise(promise, {
          loading: "Deleting...",
          success: "Deleted successfully",
          error: "Error deleting",
        });

        await mutate(key);
        await mutate(`/api/events/${eventId}/conversations`);
        if (onDelete) onDelete();
        return true;
      } catch {
        return false;
      } finally {
        setMutationLoading(false);
      }
    }
  };
  return {
    conversation: data?.conversation,
    loading: isLoading,
    mutationLoading,
    error,
    refetch: () => mutate(key),
    deleteConversation,
    DeleteConfirmElement: ConfirmModal,
  };
};
