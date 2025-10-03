import { getGmailClientForEvent } from "#util/google";
import { verifyAttachment } from "#util/signedUrl";
import { reportApiError } from "#util/reportApiError.js";
import { S3Client, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

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
  // If a valid signature is present, treat as unauthenticated
  (req, _res, next) => {
    const { eventId, messageId, attachmentId } = req.params;
    const sig = req.query?.sig;
    const { ok } = verifyAttachment(sig, { eventId, messageId, attachmentId });
    if (ok) {
      // Strip auth header so verifyAuth allows unauthenticated
      if (req.headers && req.headers.authorization) {
        delete req.headers.authorization;
      }
    }
    next();
  },
  async (req, res) => {
    const { eventId, messageId, attachmentId } = req.params;

    // If unauthenticated, require a valid short-lived signature
    if (!req.hasUser) {
      const sig = req.query?.sig;
      const { ok, code } = verifyAttachment(sig, {
        eventId,
        messageId,
        attachmentId,
      });
      if (!ok) {
        const message =
          code === "EXPIRED"
            ? "Signed link expired"
            : code === "MISSING"
              ? "Missing signature"
              : "Invalid signature";
        return res.status(401).json({ message });
      }
    }

    try {
      // Prepare S3 client and deterministic key for this attachment
      const s3 = new S3Client({
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        region: process.env.AWS_REGION,
        endpoint: process.env.AWS_ENDPOINT,
      });
      const s3Bucket = process.env.AWS_BUCKET;
      const safe = (s) => String(s || "").replace(/[^a-zA-Z0-9._-]+/g, "-");
      const s3Key = `${process.env.PROJECT_NAME}/gmail/${safe(eventId)}/${safe(messageId)}/${safe(attachmentId)}`;
      const s3Location = `${process.env.AWS_ENDPOINT}/${s3Bucket}/${s3Key}`;

      // If already present in S3, redirect immediately
      try {
        await s3.send(new HeadObjectCommand({ Bucket: s3Bucket, Key: s3Key }));
        return res.redirect(302, s3Location);
      } catch (_) {
        void _;
        // Not found; continue
      }

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
      const leafPart = leafNode.part;

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
      const ext = (filename.split(".").pop() || "").toLowerCase();
      const extMap = {
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
      const ctHeader = (ctRaw || "").split(";")[0].trim();
      const leafType = (leafPart?.mimeType || "").trim();
      const metaType = (metaPart?.mimeType || "").trim();
      let contentType =
        // Prefer leaf mimeType if it's specific
        (leafType && !/^multipart\//i.test(leafType) ? leafType : null) ||
        // Then the Content-Type header main value (without params)
        (ctHeader && !/^multipart\//i.test(ctHeader) ? ctHeader : null) ||
        // Then the meta part mimeType
        (metaType && !/^multipart\//i.test(metaType) ? metaType : null) ||
        // Fallback by extension
        extMap[ext] ||
        null ||
        // Ultimate fallback
        "application/octet-stream";

      // 10) Convert base64url -> Buffer
      const buffer = Buffer.from(
        base64url.replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
      );

      // 11) Upload to S3 then redirect. If upload fails, fall back to direct send.
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: s3Bucket,
            Key: s3Key,
            Body: buffer,
            ContentType: contentType,
            ContentLength: Buffer.byteLength(buffer),
            ACL: "public-read",
          })
        );
        return res.redirect(302, s3Location);
      } catch (err) {
        console.error("Failed to upload attachment to S3", err);
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Length", Buffer.byteLength(buffer));
        const disposition = contentType.startsWith("image/")
          ? `inline; filename="${filename}"`
          : `attachment; filename="${filename}"`;
        res.setHeader("Content-Disposition", disposition);
        if (!req.hasUser) {
          res.setHeader("Cache-Control", "private, max-age=60");
        }
        return res.status(200).send(buffer);
      }
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
      reportApiError(e, req);
      return res.status(500).end();
    }
  },
];
