import { verifyAuth } from "#verifyAuth";
import { z } from "zod";
import {
  getGmailClientForEvent,
  getHeader,
  extractBodiesAndAttachments,
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

const arrify = (v) => (Array.isArray(v) ? v : v ? [v] : []);

const base64url = (str) =>
  Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, threadId } = req.params;
    try {
      const { gmail } = await getGmailClientForEvent(eventId);
      const resp = await gmail.users.threads.get({
        userId: "me",
        id: threadId,
        format: "full",
      });
      const data = resp.data || {};
      const messages = (data.messages || []).map((m) => {
        const subject = getHeader(m.payload, "Subject");
        const from = getHeader(m.payload, "From");
        const to = getHeader(m.payload, "To");
        const cc = getHeader(m.payload, "Cc");
        const bcc = getHeader(m.payload, "Bcc");
        const date = getHeader(m.payload, "Date");
        const messageId = getHeader(m.payload, "Message-ID");
        const references = getHeader(m.payload, "References");
        const inReplyTo = getHeader(m.payload, "In-Reply-To");
        const bodies = extractBodiesAndAttachments(m.payload);
        return {
          id: m.id,
          threadId: m.threadId,
          labelIds: m.labelIds || [],
          snippet: m.snippet || null,
          internalDate: m.internalDate
            ? new Date(Number(m.internalDate))
            : null,
          sizeEstimate: m.sizeEstimate || null,
          headers: {
            subject,
            from,
            to,
            cc,
            bcc,
            date,
            messageId,
            references,
            inReplyTo,
          },
          textBody: bodies.text,
          htmlBody: bodies.html,
          attachments: bodies.attachments,
        };
      });
      const messagesCount = messages.length;
      const subject = messages[0]?.headers?.subject || null;
      const lastInternalDate =
        messages[messages.length - 1]?.internalDate || null;
      const isUnread = (resp.data.messages || []).some((m) =>
        (m.labelIds || []).includes("UNREAD")
      );

      return res.status(200).json({
        thread: {
          id: data.id,
          historyId: data.historyId,
          messagesCount,
          subject,
          lastInternalDate,
          isUnread,
        },
        messages,
      });
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
      const { to, cc, bcc, subject: subjectIn, text, html } = parse.data;

      const { gmail, connection } = await getGmailClientForEvent(eventId);
      // Get last message to build reply headers
      const thread = await gmail.users.threads.get({
        userId: "me",
        id: threadId,
        format: "metadata",
        metadataHeaders: [
          "Message-ID",
          "References",
          "Subject",
          "Reply-To",
          "From",
        ],
      });
      const msgs = thread.data.messages || [];
      if (msgs.length === 0)
        return res.status(404).json({ message: "Thread not found" });
      const last = msgs[msgs.length - 1];
      const lastPayload = last.payload;
      const lastMsgId = getHeader(lastPayload, "Message-ID");
      const lastRefs = getHeader(lastPayload, "References");
      const lastSubject = getHeader(lastPayload, "Subject") || "";
      const replyToHdr = getHeader(lastPayload, "Reply-To");
      const fromHdr = getHeader(lastPayload, "From");

      const recipients = arrify(to?.length ? to : replyToHdr || fromHdr).join(
        ", "
      );
      if (!recipients) {
        return res
          .status(400)
          .json({ message: "No recipients resolved for reply" });
      }
      let subject = subjectIn || lastSubject || "";
      if (!/^\s*re:/i.test(subject) && lastSubject) subject = `Re: ${subject}`;

      const headers = [];
      headers.push(["From", connection.email]);
      headers.push(["To", recipients]);
      if (cc) headers.push(["Cc", arrify(cc).join(", ")]);
      if (bcc) headers.push(["Bcc", arrify(bcc).join(", ")]);
      headers.push(["Subject", subject]);
      if (lastMsgId) headers.push(["In-Reply-To", lastMsgId]);
      const references = [lastRefs, lastMsgId].filter(Boolean).join(" ");
      if (references) headers.push(["References", references]);
      headers.push(["MIME-Version", "1.0"]);

      // Build MIME body
      const boundary = `b_${Math.random().toString(36).slice(2)}`;
      let mime = headers.map(([k, v]) => `${k}: ${v}`).join("\r\n");
      if (text && html) {
        mime += `\r\nContent-Type: multipart/alternative; boundary=\"${boundary}\"\r\n\r\n`;
        mime += `--${boundary}\r\nContent-Type: text/plain; charset=\"UTF-8\"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${text}\r\n`;
        mime += `--${boundary}\r\nContent-Type: text/html; charset=\"UTF-8\"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${html}\r\n`;
        mime += `--${boundary}--`;
      } else if (html) {
        mime += `\r\nContent-Type: text/html; charset=\"UTF-8\"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${html}`;
      } else {
        mime += `\r\nContent-Type: text/plain; charset=\"UTF-8\"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${text || ""}`;
      }

      const raw = base64url(mime);
      const sent = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw, threadId },
      });

      // Fetch metadata of the sent message for client context
      const sentId = sent?.data?.id;
      let meta = null;
      if (sentId) {
        const g = await gmail.users.messages.get({
          userId: "me",
          id: sentId,
          format: "metadata",
          metadataHeaders: ["Message-ID", "Date"],
        });
        meta = g.data || null;
      }

      return res.status(200).json({
        success: true,
        messageId: meta ? getHeader(meta.payload, "Message-ID") : null,
        id: sentId || null,
        threadId,
        labelIds: sent?.data?.labelIds || [],
        serverResponseSize: sent?.data?.sizeEstimate || null,
      });
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
      console.error("[conversations v2 thread post]", e);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];
