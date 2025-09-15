import useSWRMutation from "swr/mutation";
import { mutate } from "swr";
import toast from "react-hot-toast";
import { useConfirm } from "tabler-react-2";
import { authFetch } from "../util/url";

// Delete (trash) a Gmail conversation thread
// Args: { eventId, threadId }
// Returns: { deleteThread, mutationLoading, DeleteConfirmElement }
export const useConversationThreadDelete = ({ eventId, threadId } = {}) => {
  const key =
    eventId && threadId
      ? `/api/events/${eventId}/conversations/v2/threads/${threadId}`
      : null;

  const { confirm, ConfirmModal } = useConfirm({
    title: "Move conversation to Trash?",
    text: "This will move the entire thread to Gmail Trash.",
  });

  const { trigger, isMutating } = useSWRMutation(
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

  const revalidateRelated = async () => {
    if (key) await mutate(key);
    await mutate(
      (k) =>
        typeof k === "string" &&
        k.startsWith(`/api/events/${eventId}/conversations/v2/threads`)
    );
  };

  const deleteThread = async ({ onSuccess, onOptimistic } = {}) => {
    if (!key) return false;
    let prevDetail = null;
    try {
      const ok = await confirm();
      if (!ok) return false;

      if (typeof onOptimistic === "function") onOptimistic();

      // Snapshot current detail for rollback
      prevDetail = await mutate(key, (cur) => cur, { revalidate: false });

      // Optimistically clear the detail and remove from any list caches
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

      const p = trigger();
      await toast.promise(p, {
        loading: "Trashing conversation...",
        success: "Conversation moved to Trash",
        error: (e) => e?.message || "Failed to trash conversation",
      });
      await revalidateRelated();
      if (typeof onSuccess === "function") onSuccess();
      return true;
    } catch (e) {
      // Rollback optimistic detail and revalidate lists to restore if needed
      try {
        // Best-effort: restore previous detail snapshot
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
    deleteThread,
    mutationLoading: isMutating,
    DeleteConfirmElement: ConfirmModal,
  };
};
