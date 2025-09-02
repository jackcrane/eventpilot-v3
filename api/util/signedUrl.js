import jwt from "jsonwebtoken";

const PURPOSE = "attachment";

export const signAttachment = (
  { eventId, messageId, attachmentId },
  ttlSeconds = 60
) => {
  const payload = {
    p: PURPOSE,
    e: String(eventId),
    m: String(messageId),
    a: String(attachmentId),
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ttlSeconds });
};

export const verifyAttachment = (
  token,
  { eventId, messageId, attachmentId }
) => {
  if (!token) return { ok: false, code: "MISSING" };
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded?.p !== PURPOSE) return { ok: false, code: "WRONG_PURPOSE" };
    const matches =
      String(decoded?.e) === String(eventId) &&
      String(decoded?.m) === String(messageId) &&
      String(decoded?.a) === String(attachmentId);
    if (!matches) return { ok: false, code: "MISMATCH" };
    return { ok: true, decoded };
  } catch (e) {
    if (e?.name === "TokenExpiredError") return { ok: false, code: "EXPIRED" };
    return { ok: false, code: "INVALID" };
  }
};

