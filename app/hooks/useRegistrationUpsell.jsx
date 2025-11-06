import useSWR, { useSWRConfig } from "swr";
import { authFetch } from "../util/url";
import { useState } from "react";
import toast from "react-hot-toast";
import { useConfirm } from "tabler-react-2";
import { dezerialize } from "zodex";

const fetcher = (url) => authFetch(url).then((r) => r.json());
const fetchSchema = async ([url]) => {
  const res = await authFetch(url, {
    method: "QUERY",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch schema");
  const raw = await res.json();
  return dezerialize(raw);
};

export const useRegistrationUpsell = ({ eventId, upsellItemId }) => {
  const key = `/api/events/${eventId}/registration/upsell/${upsellItemId}`;
  const unikey = `/api/events/${eventId}/registration/upsell`;
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR(key, fetcher);
  const { data: schema, loading: schemaLoading } = useSWR(
    [key, "schema"],
    fetchSchema
  );

  const [mutationLoading, setMutationLoading] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const { confirm, ConfirmModal } = useConfirm({
    title: "Are you sure you want to delete this upsell?",
    text: "This action cannot be undone.",
  });

  const updateUpsell = async (_data) => {
    setMutationLoading(true);
    try {
      const parsed = schema.safeParse(_data);
      let data;
      if (!parsed.success) {
        toast.error("Error");
        console.log(parsed.error);
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
      await mutate(unikey);
      return true;
    } catch {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };

  const deleteUpsell = async (onDelete) => {
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
        await mutate(unikey);
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
    upsell: data?.upsell,
    loading: isLoading,
    mutationLoading,
    error,
    refetch: () => mutate(key),
    schema,
    schemaLoading,
    validationError,
    updateUpsell,
    deleteUpsell,
    DeleteConfirmElement: ConfirmModal,
  };
};
