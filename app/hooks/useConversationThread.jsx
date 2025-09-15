import useSWR, { mutate } from "swr";
import useSWRMutation from "swr/mutation";
import toast from "react-hot-toast";
import { useConfirm } from "tabler-react-2";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

// Fetch a single Gmail conversation thread with messages
// Args: { eventId, threadId }
export const useConversationThread = ({ eventId, threadId } = {}) => {
  const key =
    eventId && threadId
      ? `/api/events/${eventId}/conversations/v2/threads/${threadId}`
      : null;

  // Read (detail)
  const { data, error, isLoading } = useSWR(key, fetcher);

  // Common revalidation for this event's conversations (detail + lists)
  const revalidateRelated = async () => {
    if (key) await mutate(key);
    await mutate((k) =>
      typeof k === "string" &&
      k.startsWith(`/api/events/${eventId}/conversations/v2/threads`)
    );
  };

  // Unread toggle (PATCH)
  const { trigger: triggerUnread, isMutating: updatingThread } = useSWRMutation(
    key,
    async (url, { arg }) => {
      const res = await authFetch(url, {
        method: "PATCH",
        body: JSON.stringify({ unread: Boolean(arg?.unread) }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "Failed to update thread");
        throw new Error(msg || "Failed to update thread");
      }
      return res.json();
    }
  );

  const setUnread = async (unread, { silent } = {}) => {
    if (!key) return false;
    try {
      const p = triggerUnread({ unread: Boolean(unread) });
      if (silent) {
        await p;
      } else {
        await toast.promise(p, {
          loading: unread ? "Marking as unread..." : "Marking as read...",
          success: unread ? "Marked as unread" : "Marked as read",
          error: (e) => e?.message || "Failed to update thread",
        });
      }
      await revalidateRelated();
      return true;
    } catch {
      return false;
    }
  };

  const markAsRead = (opts) => setUnread(false, opts);
  const markAsUnread = (opts) => setUnread(true, opts);

  // Delete (trash) thread (DELETE)
  const { confirm, ConfirmModal: DeleteConfirmElement } = useConfirm({
    title: "Move conversation to Trash?",
    text: "This will move the entire thread to Gmail Trash.",
  });

  const { trigger: triggerDelete, isMutating: deletingThread } = useSWRMutation(
    key,
    async (url) => {
      const res = await authFetch(url, { method: "DELETE" });
      if (!res.ok) {
        const msg = await res.text().catch(() => "Failed to delete conversation");
        throw new Error(msg || "Failed to delete conversation");
      }
      return res.json();
    }
  );

  const deleteThread = async ({ onSuccess, onOptimistic } = {}) => {
    if (!key) return false;
    let prevDetail = null;
    try {
      const ok = await confirm();
      if (!ok) return false;

      if (typeof onOptimistic === "function") onOptimistic();

      // Snapshot current detail for rollback
      prevDetail = await mutate(key, (cur) => cur, { revalidate: false });

      // Optimistically clear detail and remove from any list caches for this event
      await mutate(
        key,
        (cur) => (cur ? { ...cur, thread: { ...(cur.thread || {}), _deleted: true }, messages: [] } : cur),
        { revalidate: false }
      );
      await mutate(
        (k) => typeof k === "string" && k.startsWith(`/api/events/${eventId}/conversations/v2/threads`),
        (cur) =>
          cur && Array.isArray(cur.threads)
            ? { ...cur, threads: cur.threads.filter((t) => t?.id !== threadId) }
            : cur,
        { revalidate: false }
      );

      const p = triggerDelete();
      await toast.promise(p, {
        loading: "Trashing conversation...",
        success: "Conversation moved to Trash",
        error: (e) => e?.message || "Failed to trash conversation",
      });
      await revalidateRelated();
      if (typeof onSuccess === "function") onSuccess();
      return true;
    } catch (e) {
      // Rollback optimistic detail and revalidate lists
      try {
        if (prevDetail) {
          await mutate(key, () => prevDetail, { revalidate: false });
        }
      } catch (_) {}
      try {
        await mutate(
          (k) => typeof k === "string" && k.startsWith(`/api/events/${eventId}/conversations/v2/threads`)
        );
      } catch (_) {}
      return false;
    }
  };

  return {
    // Data
    thread: data?.thread || null,
    messages: data?.messages || [],
    responseRecipient: data?.responseRecipient || "",
    participants: Array.isArray(data?.participants) ? data.participants : [],
    loading: isLoading,
    error,
    refetch: () => (key ? mutate(key) : undefined),

    // Actions: unread toggle
    markAsRead,
    markAsUnread,
    updatingThread,

    // Actions: delete
    deleteThread,
    deletingThread,
    DeleteConfirmElement,
  };
};
