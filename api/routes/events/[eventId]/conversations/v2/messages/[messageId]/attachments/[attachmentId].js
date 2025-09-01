import { verifyAuth } from "#verifyAuth";
import { getGmailClientForEvent } from "#util/google";

// Flatten MIME tree with parent links (root included)
const flattenParts = (root) => {
  const out = [];
  if (!root) return out;
  const stack = [{ part: root, parent: null }];
  while (stack.length) {
    const { part, parent } = stack.pop();
    out.push({ part, parent });
    const kids = Array.isArray(part?.parts) ? part.parts : [];
    for (let i = kids.length - 1; i >= 0; i--) {
      stack.push({ part: kids[i], parent: part });
    }
  }
  return out;
};

// Climb ancestors to find headers/filename if leaf lacks them
const findMetadataSource = (node, indexByPart) => {
  // node: {part, parent}
  let cur = node;
  while (cur) {
    const p = cur.part;
    if (
      (p?.headers && p.headers.length) ||
      (p?.filename && p.filename.trim())
    ) {
      return p;
    }
    cur = cur.parent
      ? { part: indexByPart.get(cur.parent), parent: null }
      : null;
  }
  return node.part; // fallback to leaf
};

// Header / param helpers
const getHeader = (headers, name) => {
  if (!headers) return null;
  const h = headers.find(
    (h) => (h?.name || "").toLowerCase() === name.toLowerCase()
  );
  return h?.value || null;
};

const parseParam = (value, key) => {
  if (!value) return null;
  const star = value.match(new RegExp(`${key}\\*=([^;]+)`, "i"));
  if (star) {
    let encVal = star[1].trim().replace(/^"|"$/g, "");
    encVal = encVal.replace(/^utf-?8''/i, "");
    try {
      return decodeURIComponent(encVal);
    } catch {
      return encVal;
    }
  }
  const quoted = value.match(new RegExp(`${key}="([^"]+)"`, "i"));
  if (quoted) return quoted[1];
  const unquoted = value.match(new RegExp(`${key}=([^;\\s]+)`, "i"));
  return unquoted ? unquoted[1] : null;
};

export const get = [
  verifyAuth(["manager"]),
  async (req, res) => {
    const { eventId, messageId, attachmentId } = req.params;

    try {
      const { gmail } = await getGmailClientForEvent(eventId);

      // 1) Pull raw attachment (base64url) + its reported size
      const aResp = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId,
        id: attachmentId,
      });
      const base64url = aResp?.data?.data || null;
      const attachSize =
        typeof aResp?.data?.size === "number" ? aResp.data.size : null;
      if (!base64url) {
        return res.status(404).json({ message: "Attachment not found" });
      }

      // 2) Fetch message for MIME tree
      const mResp = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });
      const payload = mResp?.data?.payload;

      // 3) Flatten parts with parents + build a quick part index
      const flat = flattenParts(payload);
      const indexByPart = new Map(flat.map(({ part }) => [part, part]));

      // 4) Try to find the leaf by attachmentId first
      let leafNode =
        flat.find(
          ({ part }) =>
            part?.body?.attachmentId &&
            String(part.body.attachmentId) === String(attachmentId)
        ) || null;

      // 5) If not found, fallback by size (matches Gmail body.size of the leaf)
      if (!leafNode && attachSize != null) {
        leafNode =
          flat.find(
            ({ part }) =>
              part?.body?.attachmentId &&
              typeof part?.body?.size === "number" &&
              part.body.size === attachSize
          ) || null;
      }

      // 6) As a last resort, if there is exactly one attachment leaf, take it
      if (!leafNode) {
        const attachmentLeaves = flat.filter(
          ({ part }) => part?.body?.attachmentId
        );
        if (attachmentLeaves.length === 1) {
          leafNode = attachmentLeaves[0];
        }
      }

      if (!leafNode) {
        return res.status(404).json({
          message:
            "Attachment data found, but could not locate the matching MIME part in the message payload.",
        });
      }

      // 7) Promote to a metadata source (ancestor) if the leaf lacks headers/filename
      const metaPart = findMetadataSource(leafNode, indexByPart);

      // 8) Resolve filename
      const headers = metaPart?.headers || [];
      const cdRaw = getHeader(headers, "Content-Disposition");
      const ctRaw = getHeader(headers, "Content-Type");

      let filename = (metaPart?.filename || "").trim();
      if (!filename) filename = parseParam(cdRaw, "filename") || "";
      if (!filename) filename = parseParam(ctRaw, "name") || "";
      if (!filename) filename = "attachment";
      filename = filename.replace(/\r|\n/g, "");

      // 9) Resolve content type
      let contentType = "application/octet-stream";
      if (ctRaw?.trim()) {
        contentType = ctRaw.trim();
      } else if (metaPart?.mimeType) {
        contentType = String(metaPart.mimeType).trim() || contentType;
      } else {
        const ext = (filename.split(".").pop() || "").toLowerCase();
        const map = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          gif: "image/gif",
          webp: "image/webp",
          svg: "image/svg+xml",
          pdf: "application/pdf",
          txt: "text/plain",
          html: "text/html",
          csv: "text/csv",
          json: "application/json",
          xml: "application/xml",
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          doc: "application/msword",
          xls: "application/vnd.ms-excel",
          ppt: "application/vnd.ms-powerpoint",
          zip: "application/zip",
          gz: "application/gzip",
        };
        if (map[ext]) contentType = map[ext];
      }

      // 10) Convert base64url -> Buffer
      const buffer = Buffer.from(
        base64url.replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
      );

      // 11) Send
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", Buffer.byteLength(buffer));
      res.setHeader(
        "Content-Disposition",
        cdRaw || `attachment; filename="${filename}"`
      );
      res.status(200).send(buffer);
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
      console.error("[conversations v2 attachment get]", e);
      return res.status(500).end();
    }
  },
];
