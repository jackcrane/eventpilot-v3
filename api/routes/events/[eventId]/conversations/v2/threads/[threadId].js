import { verifyAuth } from "#verifyAuth";
import { z } from "zod";
import {
  getGmailClientForEvent,
  getThreadWithMessages,
  sendThreadReply,
  trashThread,
  setThreadUnread,
} from "#util/google";

const sendSchema = z
  .object({
    to: z.union([z.string(), z.array(z.string())]).optional(),
    cc: z.union([z.string(), z.array(z.string())]).optional(),
    bcc: z.union([z.string(), z.array(z.string())]).optional(),
    subject: z.string().optional(),
    text: z.string().optional(),
    html: z.string().optional(),
  })
  .refine((v) => Boolean(v.text || v.html), {
    message: "Either text or html body is required",
    path: ["text"],
  });

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, threadId } = req.params;
    try {
      const { gmail } = await getGmailClientForEvent(eventId);
      const result = await getThreadWithMessages(gmail, threadId);
      // Attach download URLs for attachments per message
      const messages = (result.messages || []).map((m) => ({
        ...m,
        attachments: (m.attachments || []).map((a) => ({
          ...a,
          downloadUrl: `/api/events/${eventId}/conversations/v2/messages/${m.id}/attachments/${encodeURIComponent(a.attachmentId)}`,
        })),
      }));
      return res.status(200).json({ ...result, messages });
    } catch (e) {
      if (e?.code === "NO_GMAIL_CONNECTION") {
        return res
          .status(404)
          .json({ message: "Gmail not connected for this event" });
      }
      const msg = String(e?.message || "");
      if (
        msg.includes("invalid_grant") ||
        msg.includes("invalid_credentials")
      ) {
        return res
          .status(400)
          .json({ message: "Gmail connection expired; please reconnect" });
      }
      console.error("[conversations v2 thread get]", e);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, threadId } = req.params;
    try {
      const parse = sendSchema.safeParse(req.body);
      if (!parse.success) {
        return res.status(400).json({ message: parse.error.message });
      }
      const { gmail, connection } = await getGmailClientForEvent(eventId);
      const result = await sendThreadReply(
        gmail,
        connection.email,
        threadId,
        parse.data
      );
      return res.status(200).json({
        success: true,
        messageId: result.messageId,
        id: result.sentId,
        threadId,
        labelIds: result.sent?.data?.labelIds || [],
        serverResponseSize: result.sent?.data?.sizeEstimate || null,
      });
    } catch (e) {
      if (e?.code === "NO_GMAIL_CONNECTION") {
        return res
          .status(404)
          .json({ message: "Gmail not connected for this event" });
      }
      if (e?.code === "THREAD_NOT_FOUND") {
        return res.status(404).json({ message: "Thread not found" });
      }
      if (e?.code === "NO_RECIPIENTS") {
        return res
          .status(400)
          .json({ message: "No recipients resolved for reply" });
      }
      const msg = String(e?.message || "");
      if (
        msg.includes("invalid_grant") ||
        msg.includes("invalid_credentials")
      ) {
        return res
          .status(400)
          .json({ message: "Gmail connection expired; please reconnect" });
      }
      console.error("[conversations v2 thread post]", e);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const del = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, threadId } = req.params;
    try {
      const { gmail } = await getGmailClientForEvent(eventId);
      const permanent =
        String(req.query?.permanent || "false").toLowerCase() === "true";
      const result = await trashThread(gmail, threadId, permanent);
      return res.status(200).json({ success: true, threadId, ...result });
    } catch (e) {
      if (e?.code === "NO_GMAIL_CONNECTION") {
        return res
          .status(404)
          .json({ message: "Gmail not connected for this event" });
      }
      const msg = String(e?.message || "");
      if (
        msg.includes("insufficientPermissions") ||
        msg.includes("insufficient")
      ) {
        return res.status(400).json({
          message: "Gmail connection missing modify scope; please reconnect",
        });
      }
      if (
        msg.includes("invalid_grant") ||
        msg.includes("invalid_credentials")
      ) {
        return res
          .status(400)
          .json({ message: "Gmail connection expired; please reconnect" });
      }
      console.error("[conversations v2 thread delete]", e);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const patch = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, threadId } = req.params;
    try {
      const unread = req.body?.unread;
      if (typeof unread !== "boolean") {
        return res
          .status(400)
          .json({ message: "Missing boolean 'unread' in body" });
      }
      const { gmail } = await getGmailClientForEvent(eventId);
      const modified = await setThreadUnread(gmail, threadId, unread);
      return res
        .status(200)
        .json({ success: true, threadId, unread, modified });
    } catch (e) {
      if (e?.code === "NO_GMAIL_CONNECTION") {
        return res
          .status(404)
          .json({ message: "Gmail not connected for this event" });
      }
      const msg = String(e?.message || "");
      if (
        msg.includes("insufficientPermissions") ||
        msg.includes("insufficient")
      ) {
        return res.status(400).json({
          message: "Gmail connection missing modify scope; please reconnect",
        });
      }
      if (
        msg.includes("invalid_grant") ||
        msg.includes("invalid_credentials")
      ) {
        return res
          .status(400)
          .json({ message: "Gmail connection expired; please reconnect" });
      }
      console.error("[conversations v2 thread options]", e);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];
