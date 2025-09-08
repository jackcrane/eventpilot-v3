// ConversationPreview.jsx
import { Avatar } from "tabler-react-2/dist/avatar";
import { Col, Row } from "../../util/Flex";
import { Typography, Badge } from "tabler-react-2";
import moment from "moment";
import { useParams } from "react-router-dom";
import { Icon } from "../../util/Icon";

const extractInitialsFromName = (name) => {
  if (!name) return null;
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const parseNameEmail = (str) => {
  if (!str) return { name: null, email: null };
  // Matches: "Name <email@x.com>" OR just "email@x.com"
  const m = String(str).match(/^\s*(?:"?([^"]+)"?\s*)?<([^>]+)>\s*$/);
  if (m) return { name: m[1] || null, email: m[2] || null };
  if (str.includes("@")) return { name: null, email: str.trim() };
  return { name: str.trim(), email: null };
};

export const STATUS_MAP = {
  RECEIVED: { color: "blue", icon: "mail-exclamation", text: "Received" },
  OPENED: { color: "success", icon: "mail-opened", text: "Opened" },
  BOUNCED: { color: "danger", icon: "mail-off", text: "Bounced" },
  DELIVERED: { color: "teal", icon: "mail-check", text: "Delivered" },
  SENT: { color: "warning", icon: "mail-share", text: "Sending" },
};

// --- Normalizers ---
const isGmailThread = (obj) =>
  obj &&
  typeof obj === "object" &&
  "lastMessage" in obj &&
  obj.lastMessage &&
  "messagesCount" in obj;

const normalizeFromGmail = (t) => {
  const lm = t.lastMessage ?? {};
  const from = parseNameEmail(lm.from);
  const to = parseNameEmail(lm.to);
  const cc =
    lm.cc && Array.isArray(lm.cc)
      ? lm.cc.map(parseNameEmail)
      : lm.cc
      ? [parseNameEmail(lm.cc)]
      : [];

  const participants = [
    ...(from.email || from.name ? [from] : []),
    ...(to.email || to.name ? [to] : []),
    ...cc,
  ].map(({ name, email }) => ({
    name: name || email || "Unknown",
    email: email || null,
  }));

  const labelIds = new Set(lm.labelIds || []);
  // Heuristic: UNREAD => RECEIVED, otherwise OPENED. If Gmail "SENT" label exists => SENT.
  let mostRecentStatus = "OPENED";
  if (labelIds.has("SENT")) mostRecentStatus = "SENT";
  else if (labelIds.has("UNREAD")) mostRecentStatus = "RECEIVED";

  return {
    id: t.id,
    participants,
    subject: lm.subject || t.snippet || "(no subject)",
    emailCount: t.messagesCount ?? 0,
    hasUnread: !!t.isUnread || labelIds.has("UNREAD"),
    sent: labelIds.has("SENT"),
    lastActivityAt: lm.internalDate || lm.date || new Date().toISOString(), // fallback
    mostRecentStatus,
  };
};

const normalizeConversation = (c) => {
  if (isGmailThread(c)) return normalizeFromGmail(c);

  // Assume it's already in the app's native shape
  return {
    id: c.id,
    participants:
      Array.isArray(c.participants) && c.participants.length
        ? c.participants
        : [{ name: "Unknown", email: null }],
    subject: c.subject || "(no subject)",
    emailCount: c.emailCount ?? 0,
    hasUnread: !!c.hasUnread,
    sent: !!c.sent,
    lastActivityAt: c.lastActivityAt || new Date().toISOString(),
    mostRecentStatus: c.mostRecentStatus || "DELIVERED",
  };
};

export const ConversationPreview = ({ conversation }) => {
  const { conversationId } = useParams();
  const c = normalizeConversation(conversation);

  const attributes = [
    c.emailCount > 0 && (
      <Icon
        key="count"
        i={`box-multiple${c.emailCount > 9 ? "" : `-${c.emailCount}`}`}
        size={18}
        style={{ marginLeft: 4 }}
      />
    ),
    c.hasUnread && (
      <div
        key="unread"
        style={{
          height: 10,
          width: 10,
          borderRadius: "50%",
          backgroundColor: "var(--tblr-primary)",
        }}
      />
    ),
  ].filter(Boolean);

  const primaryPerson = c.participants?.[0];
  const primaryDisplay = primaryPerson?.name || primaryPerson?.email || "—";

  return (
    <Row
      gap={1}
      className={`card p-1 ${conversationId === c.id ? "bg-primary-lt" : ""}`}
      align="center"
      style={{ position: "relative" }}
    >
      <div style={{ alignSelf: "flex-start" }}>
        <Col justify="space-between" align="center" style={{ flex: 1 }}>
          <Avatar initials={extractInitialsFromName(primaryDisplay)} />
          {c.sent && (
            <Typography.Text
              className="text-muted mb-0 mt-1"
              style={{ textAlign: "left" }}
            >
              sent
            </Typography.Text>
          )}
        </Col>
      </div>

      <div style={{ flex: 1 }}>
        <Col gap={0.25} align="flex-start">
          <Row gap={0.5} justify="space-between" style={{ width: "100%" }}>
            <Typography.H4 className="mb-0" style={{ textAlign: "left" }}>
              {Array.isArray(c.participants) && c.participants.length
                ? c.participants
                    .map((p) => p.name || p.email || "Unknown")
                    .join(", ")
                : primaryDisplay}
            </Typography.H4>
            <Row gap={0.5} align="center">
              {attributes}
            </Row>
          </Row>

          <Row gap={0.5} align="flex-start">
            <Typography.Text
              className="mb-0"
              style={{
                textAlign: "left",
                WebkitLineClamp: 1,
                WebkitBoxOrient: "vertical",
                display: "-webkit-box",
                overflow: "hidden",
              }}
            >
              {c.subject}
            </Typography.Text>
          </Row>

          <Row justify="space-between" align="center" style={{ width: "100%" }}>
            <span className="text-muted mb-0" style={{ textAlign: "left" }}>
              {moment(c.lastActivityAt).format("M/D/YY h:mm a")}
            </span>
            {/* <Badge soft color={STATUS_MAP[c.mostRecentStatus]?.color}>
              <Icon i={STATUS_MAP[c.mostRecentStatus]?.icon} />{" "}
              {STATUS_MAP[c.mostRecentStatus]?.text}
            </Badge> */}
          </Row>
        </Col>
      </div>
    </Row>
  );
};
