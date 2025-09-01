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
