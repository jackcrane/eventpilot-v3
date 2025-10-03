import { verifyAuth } from "#verifyAuth";
import { z } from "zod";
import { reportApiError } from "#util/reportApiError.js";
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import {
  getGmailClientForEvent,
  sendThreadReply,
  trashThread,
  setThreadUnread,
} from "#util/google";
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
    fileIds: z.array(z.string()).optional(),
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
      // Fetch conversation, messages, and linked CRM participants
      const conversation = await prisma.conversation.findFirst({
        where: { id: threadId, eventId },
        include: {
          inboundEmails: {
            orderBy: { receivedAt: "asc" },
            include: {
              from: true,
              to: true,
              cc: true,
              bcc: true,
              attachments: { include: { file: true } },
            },
          },
          outboundEmails: {
            orderBy: { createdAt: "asc" },
            include: { attachments: { include: { file: true } } },
          },
          participants: {
            where: { deleted: false },
            include: {
              emails: { where: { deleted: false } },
              phones: { where: { deleted: false } },
            },
          },
        },
      });
      if (!conversation) {
        return res.status(404).json({ message: "Thread not found" });
      }

      const toStr = (parts) =>
        Array.isArray(parts)
          ? parts
              .map((p) =>
                p?.email ? `${p.name ? p.name + " " : ""}<${p.email}>` : ""
              )
              .filter(Boolean)
              .join(", ")
          : "";

      const stripHtml = (html) =>
        String(html || "")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const inboundMsgs = conversation.inboundEmails.map((m) => ({
        id: m.id,
        threadId: conversation.id,
        labelIds: m.read === false ? ["UNREAD"] : [],
        snippet: m.textBody || stripHtml(m.htmlBody) || null,
        internalDate: m.receivedAt,
        sizeEstimate: null,
        headers: {
          subject: m.subject || "",
          from: m.from
            ? `${m.from.name ? m.from.name + " " : ""}<${m.from.email}>`
            : "",
          to: toStr(m.to),
          cc: toStr(m.cc),
          bcc: toStr(m.bcc),
          date: m.receivedAt ? new Date(m.receivedAt).toUTCString() : null,
          messageId: m.messageId || m.id,
          references: null,
          inReplyTo: null,
        },
        textBody: m.textBody,
        htmlBody: m.htmlBody,
        attachments: (m.attachments || []).map((a) => ({
          filename: a.file?.originalname || "attachment",
          mimeType: a.file?.contentType || a.file?.mimetype || null,
          attachmentId: a.fileId || a.id,
          size: a.file?.size || null,
          downloadUrl: a.file?.location || null,
        })),
      }));

      const outboundMsgs = conversation.outboundEmails.map((m) => ({
        id: m.id,
        threadId: conversation.id,
        labelIds: [],
        snippet: m.textBody || stripHtml(m.htmlBody) || null,
        internalDate: m.createdAt,
        sizeEstimate: null,
        headers: {
          subject: m.subject || "",
          from: m.from || "",
          to: m.to || "",
          cc: "",
          bcc: "",
          date: m.createdAt ? new Date(m.createdAt).toUTCString() : null,
          messageId: m.messageId || m.id,
          references: null,
          inReplyTo: null,
        },
        textBody: m.textBody,
        htmlBody: m.htmlBody,
        attachments: (m.attachments || []).map((a) => ({
          filename: a.file?.originalname || "attachment",
          mimeType: a.file?.contentType || a.file?.mimetype || null,
          attachmentId: a.fileId || a.id,
          size: a.file?.size || null,
          downloadUrl: a.file?.location || null,
        })),
      }));

      const all = [...inboundMsgs, ...outboundMsgs].sort(
        (a, b) => new Date(a.internalDate) - new Date(b.internalDate)
      );

      const last = all[all.length - 1] || null;
      const thread = {
        id: conversation.id,
        historyId: null,
        messagesCount: all.length,
        subject: last?.headers?.subject || null,
        lastInternalDate: last?.internalDate || null,
        isUnread: conversation.inboundEmails.some((e) => e.read === false),
      };

      // Determine default response recipient, mirroring sendThreadReply behavior:
      // pick the most recent message not from our own mailbox and use its From (minus our own address).
      const normalizeMailbox = (addr) => {
        if (!addr) return "";
        const [local, domain] = String(addr).toLowerCase().split("@");
        if (!domain) return String(addr).toLowerCase();
        const localNorm = local.includes("+") ? local.split("+")[0] : local;
        return `${localNorm}@${domain}`;
      };
      let selfEmail = null;
      try {
        const conn = await prisma.gmailConnection.findUnique({
          where: { eventId },
        });
        selfEmail = conn?.email || null;
      } catch (e) {
        console.error(e);
      }
      const selfNorm = normalizeMailbox(selfEmail || "");
      const pick =
        [...all].reverse().find((m) => {
          const fromHdr = m?.headers?.from || "";
          const fromList = parseAddressList(fromHdr).map((e) => e.Email);
          return fromList.some((addr) => normalizeMailbox(addr) !== selfNorm);
        }) || last;
      let responseRecipient = "";
      if (pick?.headers?.from) {
        const recs = parseAddressList(pick.headers.from)
          .filter((e) => normalizeMailbox(e.Email) !== selfNorm)
          .map((e) => `${e.Email}`);
        responseRecipient = recs.join(", ");
      }

      // Map participants to a compact payload for the client details panel
      const participants = (conversation.participants || []).map((p) => ({
        id: p.id,
        name: p.name,
        emails: (p.emails || []).map((e) => ({
          id: e.id,
          email: e.email,
          label: e.label || null,
        })),
        phones: (p.phones || []).map((ph) => ({
          id: ph.id,
          phone: ph.phone,
          label: ph.label || null,
        })),
      }));

      return res
        .status(200)
        .json({ thread, messages: all, responseRecipient, participants });
    } catch (e) {
      console.error("[conversations v2 thread get]", e);
      reportApiError(e, req);
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

      // If fileIds were provided, decide per-file: attach (<= max) or link (> max)
      const MAX_ATTACH_BYTES = Number(18 * 1024 * 1024);
      const fileIds = Array.isArray(parse.data.fileIds)
        ? parse.data.fileIds.filter(Boolean)
        : [];
      let attachableFiles = [];
      let linkFiles = [];
      if (fileIds.length) {
        try {
          const files = await prisma.file.findMany({
            where: { id: { in: fileIds } },
          });
          const s3ForHead = new S3Client({
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
            region: process.env.AWS_REGION,
            endpoint: process.env.AWS_ENDPOINT,
          });

          const encodedSize = (n) => Math.ceil(Number(n || 0) / 3) * 4;
          const resolveSize = async (f) => {
            const n = Number(f?.size ?? 0);
            if (Number.isFinite(n) && n > 0) return n;
            try {
              const head = await s3ForHead.send(
                new HeadObjectCommand({
                  Bucket: process.env.AWS_BUCKET,
                  Key: f.key,
                })
              );
              const len = Number(head?.ContentLength ?? 0);
              return Number.isFinite(len) ? len : 0;
            } catch (e) {
              console.error(
                "[gmail reply attachments size head error]",
                { fileId: f.id, key: f.key },
                e
              );
              return 0;
            }
          };

          const withSizes = await Promise.all(
            files.map(async (f) => {
              const sizeResolved = await resolveSize(f);
              return { ...f, sizeResolved };
            })
          );

          for (const f of withSizes) {
            const size = f.sizeResolved ?? f.size ?? 0;
            if (
              !Number.isFinite(size) ||
              size <= 0 ||
              encodedSize(size) > MAX_ATTACH_BYTES
            ) {
              linkFiles.push(f);
            } else {
              attachableFiles.push(f);
            }
          }
          // Log how each file will be delivered (attachment vs link)
          try {
            const summary = {
              attachments: attachableFiles.map((f) => ({
                id: f.id,
                name: f.originalname || "attachment",
                size: f.sizeResolved ?? f.size ?? null,
                sizeSource: Number(f.size ?? 0) > 0 ? "db" : "s3",
              })),
              links: linkFiles.map((f) => ({
                id: f.id,
                name: f.originalname || "attachment",
                size: f.sizeResolved ?? f.size ?? null,
                url: f.location || null,
                sizeSource: Number(f.size ?? 0) > 0 ? "db" : "s3",
              })),
            };
            console.log(
              "[gmail reply attachments decision]",
              `attachments=${summary.attachments.length}, links=${summary.links.length}`,
              summary
            );
          } catch (e) {
            console.error(e);
          }
        } catch (e) {
          console.error("[gmail reply attachments classify error]", e);
        }
      }

      // Fetch S3 content only for the attachable set
      let attachments = [];
      if (attachableFiles.length) {
        try {
          const s3 = new S3Client({
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
            region: process.env.AWS_REGION,
            endpoint: process.env.AWS_ENDPOINT,
          });
          const toBuffer = async (body) => {
            if (!body) return Buffer.from("");
            if (typeof body.transformToByteArray === "function") {
              const arr = await body.transformToByteArray();
              return Buffer.from(arr);
            }
            return new Promise((resolve, reject) => {
              const chunks = [];
              body.on("data", (c) => chunks.push(Buffer.from(c)));
              body.on("error", reject);
              body.on("end", () => resolve(Buffer.concat(chunks)));
            });
          };
          attachments = await Promise.all(
            attachableFiles.map(async (f) => {
              try {
                const resp = await s3.send(
                  new GetObjectCommand({
                    Bucket: process.env.AWS_BUCKET,
                    Key: f.key,
                  })
                );
                const buf = await toBuffer(resp.Body);
                return {
                  filename: f.originalname || "attachment",
                  contentType:
                    f.contentType || f.mimetype || "application/octet-stream",
                  data: buf,
                };
              } catch (e) {
                console.error("[gmail reply attachment fetch]", e);
                return null;
              }
            })
          );
          attachments = attachments.filter(Boolean);
        } catch (e) {
          console.error("[gmail reply attachments fetch error]", e);
        }
      }

      // If there are link-only files, append download links to body
      const linkItems = linkFiles.map((f) => ({
        name: f.originalname || "attachment",
        url: f.location,
      }));
      const appendLinkText = linkItems.length
        ? `\n\nAttachments available as downloads:\n` +
          linkItems.map((i) => `- ${i.name}: ${i.url}`).join("\n")
        : "";
      const appendLinkHtml = linkItems.length
        ? `\n\n<hr/><p><strong>Attachments available as downloads:</strong></p><ul>` +
          linkItems
            .map((i) => `<li><a href="${i.url}">${i.name}</a></li>`)
            .join("") +
          `</ul>`
        : "";
      const bodyText = (parse.data.text || "") + appendLinkText;
      const bodyHtml = parse.data.html
        ? parse.data.html + appendLinkHtml
        : undefined;
      let result;
      try {
        result = await sendThreadReply(gmail, connection.email, threadId, {
          ...parse.data,
          text: bodyText,
          html: bodyHtml,
          attachments,
        });
      } catch (e) {
        console.error(
          "[gmail reply send error]",
          {
            threadId,
            to: parse.data.to,
            cc: parse.data.cc,
            bcc: parse.data.bcc,
            subject: parse.data.subject,
            attachmentsCount: Array.isArray(attachments)
              ? attachments.length
              : 0,
            linkOnlyCount: Array.isArray(linkFiles) ? linkFiles.length : 0,
          },
          e
        );
        throw e; // propagate to existing error handling
      }
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
              metadataHeaders: [
                "Message-ID",
                "From",
                "To",
                "Cc",
                "Bcc",
                "Subject",
                "Date",
              ],
            });
            meta = m?.data || null;
            // eslint-disable-next-line
          } catch (e) { console.error(e); }
        }

        const headers = (meta?.payload?.headers || []).reduce(
          (acc, h) => ({ ...acc, [String(h.name).toLowerCase()]: h.value }),
          {}
        );
        const headerMsgId = headers["message-id"] || null;
        const from = headers["from"] || connection.email;
        const to =
          headers["to"] ||
          (Array.isArray(parse.data.to)
            ? parse.data.to.join(", ")
            : parse.data.to || "");
        const subject = headers["subject"] || parse.data.subject || "";

        // Prefer RFC Message-ID, fall back to Gmail message id (sentId)
        const persistedMessageId = msgId || headerMsgId || sentId;

        // Dedupe by messageId
        const exists = persistedMessageId
          ? await prisma.email.findFirst({
              where: {
                messageId: persistedMessageId,
                conversationId: threadId,
              },
            })
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
                where: {
                  email: { equals: r.Email, mode: "insensitive" },
                  crmPerson: { eventId },
                },
                select: { crmPersonId: true },
              });
              if (match?.crmPersonId) {
                crmPersonId = match.crmPersonId;
                break;
              }
            }
            // eslint-disable-next-line
          } catch (e) { console.error(e); }

          emailRecord = await prisma.email.create({
            data: {
              // conversation: { connect: { id: threadId } },
              conversationId: threadId,
              messageId: persistedMessageId || sentId || `${Date.now()}`,
              from,
              to,
              subject,
              htmlBody: bodyHtml || null,
              textBody: bodyText || null,
              crmPersonId: crmPersonId || null,
              logs: {
                create: {
                  type: "EMAIL_SENT",
                  eventId,
                  data: { source: "immediate", confirmed: false },
                },
              },
            },
          });

          // Persist outbound attachment/link records for this email
          try {
            const outData = [];
            for (const f of attachableFiles) {
              outData.push({
                emailId: emailRecord.id,
                fileId: f.id,
                deliveryMode: "ATTACHMENT",
              });
            }
            for (const f of linkFiles) {
              outData.push({
                emailId: emailRecord.id,
                fileId: f.id,
                deliveryMode: "LINK",
              });
            }
            if (outData.length) {
              await prisma.outboundEmailAttachment.createMany({
                data: outData,
              });
            }
          } catch (e) {
            console.error("[gmail reply persist outbound attachments]", e);
          }

          // Ensure conversation participants from recipients
          try {
            const recs = parseAddressList(to);
            for (const r of recs) {
              await upsertConversationCrmPerson(r.Email, threadId, eventId);
            }
            // eslint-disable-next-line
          } catch (e) { console.error(e); }

          // SSE fan-out
          try {
            sendEmailEvent(eventId, emailRecord);
            // eslint-disable-next-line
          } catch (e) { console.error(e); }
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
      reportApiError(e, req);
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
      reportApiError(e, req);
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

      // Keep database in sync for UI: flip read flags on inbound emails in this thread
      try {
        await prisma.inboundEmail.updateMany({
          where: { conversationId: threadId, eventId },
          data: { read: !unread },
        });
      } catch (e) { console.error(e); }
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
      reportApiError(e, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
];
