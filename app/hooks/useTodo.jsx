import useSWR, { useSWRConfig } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";
import { useState } from "react";
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

export const useTodo = ({ eventId, todoId }) => {
  const key = eventId && todoId ? `/api/events/${eventId}/todos/${todoId}` : null;
  const listKey = eventId ? `/api/events/${eventId}/todos` : null;
  const { mutate: boundMutate } = useSWRConfig();

  const { data, error, isLoading, mutate: refetch } = useSWR(key, fetcher);
  const { data: schema } = useSWR(key ? [key, "schema"] : null, fetchSchema);

  const [mutationLoading, setMutationLoading] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const updateTodo = async (_data) => {
    if (!key) return false;
    setMutationLoading(true);
    setValidationError(null);
    try {
      const parsed = schema ? schema.safeParse(_data) : { success: true, data: _data };
      if (!parsed.success) {
        toast.error("Validation error");
        setValidationError(parsed.error?.format?.() || parsed.error || null);
        return false;
      }

      const promise = authFetch(key, {
        method: "PUT",
        body: JSON.stringify(parsed.data),
      }).then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          if (r.status === 400 && j?.message) setValidationError(j.message);
          throw new Error(j?.message || "Request failed");
        }
        return j; // { todo }
      });

      await toast.promise(promise, {
        loading: "Updating...",
        success: "Updated",
        error: (e) => e?.message || "Error",
      });

      await refetch();
      if (listKey) await boundMutate(listKey);
      return true;
    } catch (e) {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };

  const deleteTodo = async (onDelete) => {
    if (!key) return false;
    setMutationLoading(true);
    try {
      const promise = authFetch(key, { method: "DELETE" }).then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.message || "Request failed");
        return j;
      });

      await toast.promise(promise, {
        loading: "Deleting...",
        success: "Deleted",
        error: (e) => e?.message || "Error",
      });

      await refetch();
      if (listKey) await boundMutate(listKey);
      onDelete?.();
      return true;
    } catch (e) {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };

  return {
    todo: data?.todo,
    schema,
    loading: isLoading,
    mutationLoading,
    validationError,
    error,
    refetch,
    updateTodo,
    deleteTodo,
  };
};
