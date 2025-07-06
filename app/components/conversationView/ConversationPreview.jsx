import { Avatar } from "tabler-react-2/dist/avatar";
import { Col, Row } from "../../util/Flex";
import { Typography, Badge } from "tabler-react-2";
import moment from "moment";
import { useParams } from "react-router-dom";
import { Icon } from "../../util/Icon";

const extractInitialsFromName = (name) => {
  if (!name) return null;
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0].slice(0, 1) + parts[1].slice(0, 1);
};

export const STATUS_MAP = {
  RECEIVED: {
    color: "blue",
    icon: "mail-exclamation",
    text: "Received",
  },
  OPENED: {
    color: "success",
    icon: "mail-opened",
    text: "Opened",
  },
  BOUNCED: {
    color: "danger",
    icon: "mail-off",
    text: "Bounced",
  },
  DELIVERED: {
    color: "teal",
    icon: "mail-check",
    text: "Delivered",
  },
  SENT: {
    color: "warning",
    icon: "mail-share",
    text: "Sending",
  },
};

export const ConversationPreview = ({ conversation }) => {
  const { conversationId } = useParams();

  const attributes = [
    conversation.emailCount > 0 && (
      <Icon
        i={`box-multiple${
          conversation.emailCount > 9 ? "" : `-${conversation.emailCount}`
        }`}
        size={18}
        style={{ marginLeft: 4 }}
      />
    ),
    conversation.hasUnread && (
      <div
        style={{
          height: 10,
          width: 10,
          borderRadius: "50%",
          backgroundColor: "var(--tblr-primary)",
        }}
      />
    ),
  ].filter(Boolean);

  return (
    <Row
      gap={1}
      className={`card p-1 ${
        conversationId === conversation.id && "bg-primary-lt"
      }`}
      align="center"
      style={{
        position: "relative",
      }}
    >
      <div style={{ alignSelf: "flex-start" }}>
        <Col justify="space-between" align="center" style={{ flex: 1 }}>
          <Avatar
            initials={extractInitialsFromName(
              conversation.participants[0]?.name ||
                conversation.participants[0]?.email
            )}
          />
          {conversation.sent && (
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
              {conversation.participants.map((p) => p.name).join(", ")}
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
              {conversation.subject}
            </Typography.Text>
          </Row>
          <Row justify="space-between" align="center" style={{ width: "100%" }}>
            <span className="text-muted mb-0" style={{ textAlign: "left" }}>
              {moment(conversation.lastActivityAt).format("M/D/YY h:mm a")}
            </span>
            <Badge
              soft
              color={STATUS_MAP[conversation.mostRecentStatus]?.color}
            >
              <Icon i={STATUS_MAP[conversation.mostRecentStatus]?.icon} />{" "}
              {STATUS_MAP[conversation.mostRecentStatus]?.text}
            </Badge>
          </Row>
        </Col>
      </div>
    </Row>
  );
};
