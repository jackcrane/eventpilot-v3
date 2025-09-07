import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useTodoComments = ({ eventId, todoId }) => {
  const key = eventId && todoId ? `/api/todos/${todoId}/comments` : null;
  const todoKey = eventId && todoId ? `/api/todos/${todoId}` : null;
  const listKey = eventId ? `/api/todos` : null;

  const { data, error, isLoading, mutate: refetch } = useSWR(key, fetcher);

  const addComment = async ({ text, fileIds = [] }) => {
    if (!key) return false;
    try {
      const promise = authFetch(key, {
        method: "POST",
        body: JSON.stringify({ text, fileIds }),
      }).then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.message || "Request failed");
        return j; // { comment }
      });

      await toast.promise(promise, {
        loading: "Posting...",
        success: "Comment posted",
        error: (e) => e?.message || "Error",
      });

      await refetch();
      if (todoKey) await mutate(todoKey);
      if (listKey) await mutate(listKey);
      return true;
    } catch (e) {
      return false;
    }
  };

  return {
    comments: data?.comments || [],
    loading: isLoading,
    error,
    refetch,
    addComment,
  };
};

