import useSWRMutation from "swr/mutation";
import { useSWRConfig } from "swr";
import toast from "react-hot-toast";
import { authFetch } from "../util/url";

// Send a brand-new outbound email to start a conversation
// Args: { eventId }
// Trigger args: { to (string|string[]), cc?, bcc?, subject?, text? | html?, fileIds? }
export const useConversationCompose = ({ eventId } = {}) => {
  const { mutate } = useSWRConfig();
  const key = eventId ? `/api/events/${eventId}/conversations/v2/threads` : null;

  const { trigger, isMutating, error, data, reset } = useSWRMutation(
    key,
    async (url, { arg }) => {
      const res = await authFetch(url, {
        method: "POST",
        body: JSON.stringify({
          to: arg?.to,
          cc: arg?.cc,
          bcc: arg?.bcc,
          subject: arg?.subject,
          text: arg?.text,
          html: arg?.html,
          fileIds: Array.isArray(arg?.fileIds) ? arg.fileIds : undefined,
        }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "Failed to send message");
        throw new Error(msg || "Failed to send message");
      }
      return res.json();
    }
  );

  const sendNewMessage = async (args = {}) => {
    if (!key) return { ok: false, threadId: null };
    try {
      const p = trigger(args);
      const result = await toast.promise(p, {
        loading: "Sending message...",
        success: "Message sent",
        error: (e) => e?.message || "Failed to send message",
      });
      // Invalidate conversation lists
      await mutate((k) => typeof k === "string" && k.startsWith(`/api/events/${eventId}/conversations/v2/threads`));
      return { ok: true, threadId: result?.threadId || null };
    } catch {
      return { ok: false, threadId: null };
    }
  };

  return {
    sendNewMessage,
    mutationLoading: isMutating,
    error,
    lastResponse: data || null,
    reset,
  };
};
