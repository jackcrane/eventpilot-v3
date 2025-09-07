import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";
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

export const useTodos = ({ eventId }) => {
  const key = eventId ? `/api/todos` : null;

  const { data, error, isLoading, mutate: refetch } = useSWR(key, fetcher);
  const { data: schema } = useSWR(key ? [key, "schema"] : null, fetchSchema);

  const createTodo = async (_data) => {
    if (!key) return false;
    try {
      // If schema is available, validate client-side for better UX
      const parsed = schema ? schema.safeParse(_data) : { success: true, data: _data };
      if (!parsed.success) {
        toast.error("Validation error");
        return false;
      }

      const promise = authFetch(key, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      }).then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.message || "Request failed");
        return j; // { todo }
      });

      const { todo } = await toast.promise(promise, {
        loading: "Creating...",
        success: "Created",
        error: (e) => e?.message || "Error",
      });

      await refetch();
      if (todo?.id) await mutate(`/api/todos/${todo.id}`);
      return true;
    } catch (e) {
      return false;
    }
  };

  const updateTodo = async (todoId, _data) => {
    if (!todoId || !eventId) return false;
    try {
      const parsed = schema ? schema.safeParse(_data) : { success: true, data: _data };
      if (!parsed.success) {
        toast.error("Validation error");
        return false;
      }

      const url = `/api/todos/${todoId}`;
      const promise = authFetch(url, {
        method: "PUT",
        body: JSON.stringify(parsed.data),
      }).then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.message || "Request failed");
        return j; // { todo }
      });

      await toast.promise(promise, {
        loading: "Updating...",
        success: "Updated",
        error: (e) => e?.message || "Error",
      });

      await refetch();
      await mutate(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const deleteTodo = async (todoId) => {
    if (!todoId || !eventId) return false;
    try {
      const url = `/api/todos/${todoId}`;
      const promise = authFetch(url, { method: "DELETE" }).then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.message || "Request failed");
        return j; // { ok: true }
      });

      await toast.promise(promise, {
        loading: "Deleting...",
        success: "Deleted",
        error: (e) => e?.message || "Error",
      });

      await refetch();
      await mutate(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  return {
    todos: data?.todos || [],
    schema,
    loading: isLoading,
    error,
    refetch,
    createTodo,
    updateTodo,
    deleteTodo,
  };
};

