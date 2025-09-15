import useSWRMutation from "swr/mutation";
import { mutate } from "swr";
import toast from "react-hot-toast";
import { authFetch } from "../util/url";

// Toggle a Gmail conversation thread's unread status
// Args: { eventId, threadId }
export const useConversationThreadUnread = ({ eventId, threadId } = {}) => {
  const key = eventId && threadId
    ? `/api/events/${eventId}/conversations/v2/threads/${threadId}`
    : null;

  const { trigger, isMutating } = useSWRMutation(
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

  const revalidateRelated = async () => {
    // Revalidate the detail and any list queries for this event
    if (key) await mutate(key);
    await mutate((k) =>
      typeof k === "string" && k.startsWith(`/api/events/${eventId}/conversations/v2/threads`)
    );
  };

  const setUnread = async (unread, { silent } = {}) => {
    if (!key) return false;
    try {
      const p = trigger({ unread: Boolean(unread) });
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

  return {
    markAsRead: (opts) => setUnread(false, opts),
    markAsUnread: (opts) => setUnread(true, opts),
    mutationLoading: isMutating,
  };
};
