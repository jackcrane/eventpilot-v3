import useSWR, { mutate } from "swr";
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

export const useThread = ({ eventId, threadId }) => {
  const key = `/api/events/${eventId}/conversations/v2/threads/${threadId}`;
  const { data, error, isLoading } = useSWR(key, fetcher);
  const { data: schema, loading: schemaLoading } = useSWR(
    [key, "schema"],
    fetchSchema
  );
  const [mutationLoading, setMutationLoading] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const { confirm, ConfirmModal } = useConfirm({
    title: "Are you sure you want to delete this thread?",
    text: "This action cannot be undone.",
  });

  const sendToThread = async (_data) => {
    setMutationLoading(true);
    try {
      const parsed = schema.safeParse(_data);
      let data;
      if (!parsed.success) {
        toast.error("Error");
        setValidationError(parsed.error.format());
        return false;
      } else {
        data = parsed.data;
      }
      const promise = authFetch(key, {
        method: "POST",
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Sending...",
        success: "Sent successfully",
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

  const setReadState = async (unread) => {
    setMutationLoading(true);
    try {
      const promise = authFetch(key, {
        method: "PUT",
        body: JSON.stringify({ unread }),
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
      return true;
    } catch {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };

  const deleteThread = async (onDelete) => {
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
    thread: data?.thread,
    messages: data?.messages,
    loading: isLoading,
    mutationLoading,
    error,
    refetch: () => mutate(key),
    schema,
    schemaLoading,
    validationError,
    sendToThread,
    setReadState,
    deleteThread,
    DeleteConfirmElement: ConfirmModal,
  };
};
