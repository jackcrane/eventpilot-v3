import useSWRMutation from "swr/mutation";
import { mutate } from "swr";
import toast from "react-hot-toast";
import { authFetch } from "../util/url";

// Send a reply to a Gmail conversation thread
// Args: { eventId, threadId }
// Reply args for trigger: { text?, html?, subject?, to?, cc?, bcc? }
export const useConversationReply = ({ eventId, threadId } = {}) => {
  const key = eventId && threadId
    ? `/api/events/${eventId}/conversations/v2/threads/${threadId}`
    : null;

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
        }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "Failed to send reply");
        throw new Error(msg || "Failed to send reply");
      }
      return res.json();
    }
  );

  const sendReply = async (args = {}) => {
    if (!key) return false;
    try {
      // Optimistic UI: insert a temporary outbound message into cache
      const optimisticId = `temp-${Date.now()}`;
      const now = new Date();
      const optimisticMsg = {
        id: optimisticId,
        threadId: typeof threadId === "string" ? threadId : null,
        labelIds: ["PENDING"],
        snippet: args?.text || null,
        internalDate: now.toISOString(),
        sizeEstimate: null,
        headers: {
          subject: args?.subject || "",
          from: "(you)",
          to: Array.isArray(args?.to) ? args.to.join(", ") : args?.to || "",
          cc: Array.isArray(args?.cc) ? args.cc.join(", ") : args?.cc || "",
          bcc: Array.isArray(args?.bcc) ? args.bcc.join(", ") : args?.bcc || "",
          date: now.toUTCString(),
          messageId: optimisticId,
          references: null,
          inReplyTo: null,
        },
        textBody: args?.text || null,
        htmlBody: args?.html || null,
        attachments: [],
        _optimistic: true,
      };
      await mutate(
        key,
        (cur) => ({
          ...(cur || {}),
          messages: Array.isArray(cur?.messages)
            ? [...cur.messages, optimisticMsg]
            : [optimisticMsg],
          thread: cur?.thread || null,
        }),
        { revalidate: false }
      );

      const p = trigger(args);
      await toast.promise(p, {
        loading: "Sending reply...",
        success: "Reply sent",
        error: (e) => e?.message || "Failed to send reply",
      });
      await mutate(key);
      return true;
    } catch {
      // Rollback optimistic message on error
      await mutate(
        key,
        (cur) => ({
          ...(cur || {}),
          messages: Array.isArray(cur?.messages)
            ? cur.messages.filter((m) => m?.id !== optimisticId)
            : [],
          thread: cur?.thread || null,
        }),
        { revalidate: false }
      );
      return false;
    }
  };

  return {
    sendReply,
    mutationLoading: isMutating,
    error,
    lastResponse: data || null,
    reset,
  };
};
