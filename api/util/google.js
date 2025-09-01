import { google } from "googleapis";
import { prisma } from "#prisma";

/**
 * Creates an OAuth2 client initialized from the event's GmailConnection tokens
 * and returns { oauth2, gmail } clients. Auto-persists refreshed tokens.
 */
export const getGmailClientForEvent = async (eventId) => {
  const conn = await prisma.gmailConnection.findUnique({ where: { eventId } });
  if (!conn) {
    const err = new Error("No Gmail connection found for event");
    err.code = "NO_GMAIL_CONNECTION";
    throw err;
  }

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET
  );

  const expiryMs = conn.tokenExpiry
    ? new Date(conn.tokenExpiry).getTime()
    : undefined;
  oauth2.setCredentials({
    access_token: conn.accessToken,
    refresh_token: conn.refreshToken || undefined,
    expiry_date: expiryMs,
    scope: conn.scope,
    token_type: conn.tokenType,
  });

  // Persist token refreshes
  oauth2.on("tokens", async (tokens) => {
    try {
      await prisma.gmailConnection.update({
        where: { eventId },
        data: {
          accessToken: tokens.access_token ?? conn.accessToken,
          refreshToken: tokens.refresh_token ?? conn.refreshToken,
          tokenExpiry: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : conn.tokenExpiry,
          scope: tokens.scope ?? conn.scope,
          tokenType: tokens.token_type ?? conn.tokenType,
        },
      });
    } catch (e) {
      console.error("Failed to persist refreshed Google tokens", e);
    }
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  return { oauth2, gmail, connection: conn };
};

export const getHeader = (payload, name) => {
  const headers = payload?.headers || [];
  const h = headers.find(
    (h) => (h?.name || "").toLowerCase() === name.toLowerCase()
  );
  return h?.value || null;
};

export const decodeBase64Url = (data) => {
  if (!data) return "";
  const buf = Buffer.from(
    String(data).replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  );
  return buf.toString("utf8");
};

export const extractBodiesAndAttachments = (payload) => {
  const acc = { text: null, html: null, attachments: [] };

  const dig = (part) => {
    if (!part) return;
    const mime = part.mimeType || "";
    if (mime.startsWith("multipart/")) {
      (part.parts || []).forEach(dig);
      return;
    }
    if (mime === "text/plain" && !acc.text && part.body?.data) {
      acc.text = decodeBase64Url(part.body.data);
    } else if (mime === "text/html" && !acc.html && part.body?.data) {
      acc.html = decodeBase64Url(part.body.data);
    }
    const filename = part.filename || "";
    if (filename && part.body?.attachmentId) {
      acc.attachments.push({
        filename,
        mimeType: mime || null,
        attachmentId: part.body.attachmentId,
        size: part.body.size || null,
      });
    }
    (part.parts || []).forEach(dig);
  };

  dig(payload);
  if (!acc.text && payload?.mimeType === "text/plain" && payload?.body?.data) {
    acc.text = decodeBase64Url(payload.body.data);
  }
  if (!acc.html && payload?.mimeType === "text/html" && payload?.body?.data) {
    acc.html = decodeBase64Url(payload.body.data);
  }
  return acc;
};

export const arrify = (v) => (Array.isArray(v) ? v : v ? [v] : []);

export const toBase64Url = (str) =>
  Buffer.from(String(str))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export const mapGmailMessage = (m) => {
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
    internalDate: m.internalDate ? new Date(Number(m.internalDate)) : null,
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
};

export const summarizeThreadFromMessages = (data) => {
  const messages = data.messages || [];
  const count = messages.length;
  const sorted = [...messages].sort(
    (a, b) => Number(a.internalDate || 0) - Number(b.internalDate || 0)
  );
  const last = sorted[sorted.length - 1];
  const first = sorted[0];
  const lastPayload = last?.payload;
  const subject = getHeader(lastPayload, "Subject");
  const from = getHeader(lastPayload, "From");
  const to = getHeader(lastPayload, "To");
  const cc = getHeader(lastPayload, "Cc");
  const date = getHeader(lastPayload, "Date");
  const lastInternalDate = last?.internalDate
    ? new Date(Number(last.internalDate))
    : null;
  const isUnread = messages.some((m) => (m.labelIds || []).includes("UNREAD"));
  return {
    id: data.id,
    historyId: data.historyId,
    snippet: data.snippet || last?.snippet || null,
    messagesCount: count,
    lastMessage: {
      id: last?.id,
      subject,
      from,
      to,
      cc,
      date,
      internalDate: lastInternalDate,
      labelIds: last?.labelIds || [],
    },
    firstMessageId: first?.id || null,
    isUnread,
  };
};

export const fetchThreadSummary = async (gmail, id) => {
  const resp = await gmail.users.threads.get({
    userId: "me",
    id,
    format: "metadata",
    metadataHeaders: ["Subject", "From", "To", "Cc", "Date"],
  });
  return summarizeThreadFromMessages(resp.data || {});
};

export const fetchThreadsSummaries = async (gmail, ids) => {
  const details = await Promise.all(
    ids.map((id) =>
      gmail.users.threads.get({
        userId: "me",
        id,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "To", "Cc", "Date"],
      })
    )
  );
  return details.map((resp) => summarizeThreadFromMessages(resp.data || {}));
};

export const getThreadWithMessages = async (gmail, threadId) => {
  const resp = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  });
  const data = resp.data || {};
  const messages = (data.messages || []).map(mapGmailMessage);
  const summary = summarizeThreadFromMessages({
    ...data,
    messages: data.messages || [],
  });
  return {
    thread: {
      id: summary.id,
      historyId: summary.historyId,
      messagesCount: summary.messagesCount,
      subject: summary.lastMessage?.subject || null,
      lastInternalDate: summary.lastMessage?.internalDate || null,
      isUnread: summary.isUnread,
    },
    messages,
  };
};

export const buildReplyMime = ({
  from,
  recipients,
  cc,
  bcc,
  subject,
  text,
  html,
  lastMsgId,
  lastRefs,
}) => {
  const headers = [];
  headers.push(["From", from]);
  headers.push(["To", recipients]);
  if (cc) headers.push(["Cc", arrify(cc).join(", ")]);
  if (bcc) headers.push(["Bcc", arrify(bcc).join(", ")]);
  headers.push(["Subject", subject]);
  if (lastMsgId) headers.push(["In-Reply-To", lastMsgId]);
  const references = [lastRefs, lastMsgId].filter(Boolean).join(" ");
  if (references) headers.push(["References", references]);
  headers.push(["MIME-Version", "1.0"]);

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
  return mime;
};

export const sendThreadReply = async (
  gmail,
  connectionEmail,
  threadId,
  { to, cc, bcc, subject, text, html }
) => {
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
  if (msgs.length === 0) {
    const err = new Error("Thread not found");
    err.code = "THREAD_NOT_FOUND";
    throw err;
  }
  const last = msgs[msgs.length - 1];
  const lastPayload = last.payload;
  const lastMsgId = getHeader(lastPayload, "Message-ID");
  const lastRefs = getHeader(lastPayload, "References");
  const lastSubject = getHeader(lastPayload, "Subject") || "";
  const replyToHdr = getHeader(lastPayload, "Reply-To");
  const fromHdr = getHeader(lastPayload, "From");

  const recipients = arrify(to?.length ? to : replyToHdr || fromHdr).join(", ");
  if (!recipients) {
    const err = new Error("No recipients resolved for reply");
    err.code = "NO_RECIPIENTS";
    throw err;
  }
  let subj = subject || lastSubject || "";
  if (!/^\s*re:/i.test(subj) && lastSubject) subj = `Re: ${subj}`;

  const mime = buildReplyMime({
    from: connectionEmail,
    recipients,
    cc,
    bcc,
    subject: subj,
    text,
    html,
    lastMsgId,
    lastRefs,
  });
  const raw = toBase64Url(mime);
  const sent = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw, threadId },
  });

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
  return {
    sent,
    sentId: sentId || null,
    messageId: meta ? getHeader(meta.payload, "Message-ID") : null,
  };
};

export const trashThread = async (gmail, threadId, permanent = false) => {
  if (permanent) {
    await gmail.users.threads.delete({ userId: "me", id: threadId });
    return { deleted: true, trashed: false };
  }
  const resp = await gmail.users.threads.trash({ userId: "me", id: threadId });
  return { deleted: false, trashed: true, raw: resp?.data ?? null };
};

export const setThreadUnread = async (gmail, threadId, unread = true) => {
  // Gmail doesn't have a READ label. Mark unread by adding UNREAD; mark read by removing UNREAD.
  const requestBody = unread
    ? { addLabelIds: ["UNREAD"], removeLabelIds: [] }
    : { addLabelIds: [], removeLabelIds: ["UNREAD"] };
  const resp = await gmail.users.threads.modify({
    userId: "me",
    id: threadId,
    requestBody,
  });
  return resp?.data ?? null;
};
