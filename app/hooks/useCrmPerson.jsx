import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";
import { useConfirm } from "tabler-react-2";
import { useState } from "react";
const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useCrmPerson = ({ eventId, personId }) => {
  const key = `/api/events/${eventId}/crm/person/${personId}`;
  const { data, error, isLoading } = useSWR(key, fetcher);
  const [mutationLoading, setMutationLoading] = useState(false);
  const { confirm, ConfirmModal } = useConfirm({
    title: "Are you sure you want to delete this person?",
    text: "This action cannot be undone.",
  });

  const updateCrmPerson = async (data) => {
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

      await mutate(key);
      await mutate(`/api/events/${eventId}/crm/person`);
      return true;
    } catch {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };

  const deleteCrmPerson = async (onDelete) => {
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
        await mutate(`/api/events/${eventId}/crm/person`);
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
    crmPerson: data?.crmPerson,
    loading: isLoading,
    mutationLoading,
    error,
    refetch: () => mutate(key),
    updateCrmPerson,
    deleteCrmPerson,
    DeleteConfirmElement: ConfirmModal,
  };
};
