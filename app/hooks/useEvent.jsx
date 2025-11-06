import useSWR, { useSWRConfig } from "swr";
import { authFetch } from "../util/url";
import { useState } from "react";
import toast from "react-hot-toast";
import { useConfirm } from "tabler-react-2";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useEvent = ({ eventId, refreshInterval = 0 }) => {
  const key = `/api/events/${eventId}`;
  const { mutate: boundMutate } = useSWRConfig();
  const [mutationLoading, setMutationLoading] = useState(false);
  const { confirm, ConfirmModal } = useConfirm({
    title: "Are you sure you want to delete this event?",
    text: "This action cannot be undone. Everything will be deleted. Your volunteers and contacts will not be notified.",
  });

  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(`/api/events/${eventId}`, fetcher, {
    refreshInterval,
  });

  const updateEvent = async (data) => {
    setMutationLoading(true);
    try {
      const promise = authFetch(key, {
        method: "PUT",
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Updating...",
        success: "Updated successfully",
        error: "Error",
      });

      await boundMutate(key); // Invalidate and refetch
      return true;
    } catch {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };

  const deleteEvent = async (onDelete) => {
    if (await confirm()) {
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

        await boundMutate(key); // Invalidate and refetch
        if (onDelete) onDelete();
        return true;
      } catch {
        return false;
      }
    }
  };

  return {
    event: data?.event,
    loading: isLoading,
    updateEvent,
    mutationLoading,
    deleteEvent,
    DeleteConfirmElement: ConfirmModal,
    error,
    refetch,
  };
};
