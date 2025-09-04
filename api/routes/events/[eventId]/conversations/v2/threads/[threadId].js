import { verifyAuth } from "#verifyAuth";
import { z } from "zod";
import {
  getGmailClientForEvent,
  getThreadWithMessages,
  sendThreadReply,
  trashThread,
  setThreadUnread,
} from "#util/google";
import { signAttachment } from "#util/signedUrl";
import { prisma } from "#prisma";
import { sendEmailEvent } from "#sse";
import { upsertConversationCrmPerson } from "#util/upsertConversationCrmPerson";

// Lightweight RFC 5322-ish address list parser for dedupe/linking
const parseAddressList = (value) => {
  if (!value) return [];
  const parts = [];
  let cur = "";
  let depth = 0;
  let inQuotes = false;
  for (const ch of String(value)) {
    if (ch === '"') inQuotes = !inQuotes;
    if (!inQuotes) {
      if (ch === "<") depth++;
      if (ch === ">" && depth > 0) depth--;
    }
    if (ch === "," && !inQuotes && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts
    .map((p) => {
      const m = p.match(/^(.*)<([^>]+)>\s*$/);
      if (m) {
        const name = m[1].trim().replace(/^"|"$/g, "");
        const email = m[2].trim();
        return { Email: email, Name: name || email };
      }
      const email = p.replace(/^"|"$/g, "").trim();
      return { Email: email, Name: email };
    })
    .filter((e) => /@/.test(e.Email));
};

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
          downloadUrl: (() => {
            const sig = signAttachment({
              eventId,
              messageId: m.id,
              attachmentId: a.attachmentId,
            });
            return `/api/events/${eventId}/conversations/v2/messages/${m.id}/attachments/${encodeURIComponent(
              a.attachmentId
            )}?sig=${encodeURIComponent(sig)}`;
          })(),
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
      // Persist immediately; cron will later confirm/dedupe by Message-ID
      try {
        const msgId = result.messageId || null;
        const sentId = result.sentId || null;

        // Fetch metadata for canonical headers
        let meta = null;
        if (sentId) {
          try {
            const m = await gmail.users.messages.get({
              userId: "me",
              id: sentId,
              format: "metadata",
              metadataHeaders: ["Message-ID", "From", "To", "Cc", "Bcc", "Subject", "Date"],
            });
            meta = m?.data || null;
          } catch (_) {}
        }

        const headers = (meta?.payload?.headers || []).reduce(
          (acc, h) => ({ ...acc, [String(h.name).toLowerCase()]: h.value }),
          {}
        );
        const from = headers["from"] || connection.email;
        const to = headers["to"] || (Array.isArray(parse.data.to) ? parse.data.to.join(", ") : parse.data.to || "");
        const subject = headers["subject"] || parse.data.subject || "";

        // Dedupe by messageId
        const exists = msgId
          ? await prisma.email.findFirst({ where: { messageId: msgId, conversationId: threadId } })
          : null;
        let emailRecord = exists;
        if (!exists) {
          // Link to a CRM person if any recipient matches
          let crmPersonId = null;
          try {
            const recipients = parseAddressList(to)
              .concat(parseAddressList(headers["cc"]))
              .concat(parseAddressList(headers["bcc"]));
            for (const r of recipients) {
              const match = await prisma.crmPersonEmail.findFirst({
                where: { email: { equals: r.Email, mode: "insensitive" }, crmPerson: { eventId } },
                select: { crmPersonId: true },
              });
              if (match?.crmPersonId) {
                crmPersonId = match.crmPersonId;
                break;
              }
            }
          } catch (_) {}

          emailRecord = await prisma.email.create({
            data: {
              conversation: { connect: { id: threadId } },
              messageId: msgId || undefined,
              from,
              to,
              subject,
              htmlBody: parse.data.html || null,
              textBody: parse.data.text || null,
              crmPersonId: crmPersonId || null,
            },
          });

          // Ensure conversation participants from recipients
          try {
            const recs = parseAddressList(to);
            for (const r of recs) {
              await upsertConversationCrmPerson(r.Email, threadId, eventId);
            }
          } catch (_) {}

          // SSE fan-out
          try {
            sendEmailEvent(eventId, emailRecord);
          } catch (_) {}
        }
      } catch (e) {
        // Non-fatal; cron will reconcile
        console.error("[gmail reply immediate persist]", e);
      }

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
