import { prisma } from "#prisma";
import { uploadFile } from "#file";

// Very lightweight parser for RFC 5322 address lists
// Returns array of { Email, Name }
export const parseAddressList = (value) => {
  if (!value) return [];
  // Split by commas not inside quotes or angle brackets
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

const base64UrlToBase64 = (s) => {
  const str = String(s).replace(/-/g, "+").replace(/_/g, "/");
  const pad = str.length % 4;
  if (pad === 2) return str + "==";
  if (pad === 3) return str + "=";
  if (pad === 1) return str + "AAA"; // extremely rare
  return str;
};

export const createInboundEmailFromGmail = async (
  {
    gmail,
    eventId,
    conversationId,
    message, // from mapGmailMessage
    connectionEmail, // exclude this from CRM person matching
  },
  reqId = ""
) => {
  // Build participant arrays
  const fromArr = parseAddressList(message.headers.from);
  const toArr = parseAddressList(message.headers.to);
  const ccArr = parseAddressList(message.headers.cc);
  const bccArr = parseAddressList(message.headers.bcc);

  // Create inbound email record
  const createdInboundEmail = await prisma.inboundEmail.create({
    data: {
      event: eventId ? { connect: { id: eventId } } : undefined,
      conversation: { connect: { id: conversationId } },
      from: {
        create: fromArr[0]
          ? {
              email: fromArr[0].Email,
              name: fromArr[0].Name,
            }
          : undefined,
      },
      to: {
        createMany: {
          data: toArr.map((t) => ({ email: t.Email, name: t.Name })),
        },
      },
      cc: {
        createMany: {
          data: ccArr.map((t) => ({ email: t.Email, name: t.Name })),
        },
      },
      bcc: {
        createMany: {
          data: bccArr.map((t) => ({ email: t.Email, name: t.Name })),
        },
      },
      subject: message.headers.subject || "",
      messageId: message.headers.messageId || message.id,
      originalRecipient: connectionEmail || null,
      replyTo: null,
      mailboxHash: message.threadId,
      receivedAt: message.internalDate || new Date(),
      textBody: message.textBody || null,
      htmlBody: message.htmlBody || null,
      strippedTextReply: null,
    },
    include: { from: true },
  });

  // Attachments (optional)
  try {
    if (message.attachments && message.attachments.length) {
      for (const a of message.attachments) {
        try {
          const created = await prisma.inboundEmailAttachment.create({
            data: { inboundEmailId: createdInboundEmail.id },
          });
          const aResp = await gmail.users.messages.attachments.get({
            userId: "me",
            messageId: message.id,
            id: a.attachmentId,
          });
          const data = aResp?.data?.data || null; // base64url
          if (!data) continue;
          const uploadedFile = await uploadFile({
            name: a.filename || "attachment",
            file: base64UrlToBase64(data),
            contentType: a.mimeType || "application/octet-stream",
            contentLength: a.size || undefined,
            inboundEmailAttachmentId: created.id,
          });
          await prisma.inboundEmailAttachment.update({
            where: { id: created.id },
            data: { fileId: uploadedFile.id },
          });
        } catch (err) {
          console.error(`[${reqId}] error saving gmail attachment:`, err);
        }
      }
    }
  } catch (err) {
    console.error(`[${reqId}] attachment processing error:`, err);
  }

  return createdInboundEmail;
};

export const buildCrmBodyFromGmailMessage = (message, connectionEmail) => {
  const fromArr = parseAddressList(message.headers.from);
  const toArr = parseAddressList(message.headers.to);
  const ccArr = parseAddressList(message.headers.cc);
  const bccArr = parseAddressList(message.headers.bcc);
  const exclude = String(connectionEmail || "").toLowerCase();
  const filterSelf = (arr) =>
    arr.filter((e) => String(e.Email || "").toLowerCase() !== exclude);
  return {
    FromFull: fromArr[0] ? { ...fromArr[0] } : { Email: "", Name: "" },
    ToFull: filterSelf(toArr),
    CcFull: filterSelf(ccArr),
    BccFull: filterSelf(bccArr),
  };
};
