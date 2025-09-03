import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import { useState } from "react";
import toast from "react-hot-toast";
import { useConfirm } from "tabler-react-2";
import { dezerialize } from "zodex";

const fetcher = (url) => authFetch(url, null, false).then((r) => r.json());

const fetchSchema = async ([url]) => {
  const res = await authFetch(url, {
    method: "QUERY",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch schema");
  const raw = await res.json();
  return dezerialize(raw);
};

export const useInstance = ({ eventId, instanceId }) => {
  const skip = instanceId === "eventpilot__create";
  const key = skip ? null : `/api/events/${eventId}/instances/${instanceId}`;

  const { data, error, isLoading } = useSWR(key, fetcher);
  const { data: schema, isLoading: schemaLoading } = useSWR(
    skip ? null : [key, "schema"],
    fetchSchema
  );

  const [mutationLoading, setMutationLoading] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const { confirm, ConfirmModal } = useConfirm({
    title: "Are you sure you want to delete this instance?",
    text: "This action cannot be undone.",
  });

  const updateInstance = async (_data) => {
    if (skip) return false;
    setMutationLoading(true);
    try {
      const parsed = schema.safeParse(_data);
      console.log(parsed.error);
      let data;
      if (!parsed.success) {
        toast.error("Error");
        console.log(_data);
        setValidationError(parsed.error.format());
        return false;
      } else {
        data = parsed.data;
      }
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
      await mutate(`/api/events/${eventId}/instances`);
      return true;
    } catch {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };

  const deleteInstance = async (onDelete) => {
    if (skip) return false;
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
        // Invalidate instances list so deleted instance disappears everywhere
        if (eventId) await mutate(`/api/events/${eventId}/instances`);
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
    instance: data?.instance,
    loading: skip ? false : isLoading,
    mutationLoading,
    error,
    refetch: () => (skip ? null : mutate(key)),
    schema,
    schemaLoading,
    validationError,
    updateInstance,
    deleteInstance,
    DeleteConfirmElement: ConfirmModal,
  };
};
