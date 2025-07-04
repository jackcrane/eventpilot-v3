import { Avatar } from "tabler-react-2/dist/avatar";
import { Col, Row } from "../../util/Flex";
import { Typography } from "tabler-react-2";
import moment from "moment";
import { useParams } from "react-router-dom";

const extractInitialsFromName = (name) => {
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0].slice(0, 1) + parts[1].slice(0, 1);
};

export const ConversationPreview = ({ conversation }) => {
  const { conversationId } = useParams();

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
        <Avatar
          initials={extractInitialsFromName(conversation.participants[0]?.name)}
        />
      </div>
      <div>
        <Col gap={0.25} align="flex-start">
          <Row gap={0.5} align="flex-start">
            <Typography.H4 className="mb-0" style={{ textAlign: "left" }}>
              {conversation.participants.map((p) => p.name).join(", ")}
            </Typography.H4>
          </Row>
          <Row gap={0.5} align="flex-start">
            <Typography.Text className="mb-0" style={{ textAlign: "left" }}>
              {conversation.subject}
            </Typography.Text>
          </Row>
          <Row gap={0.5}>
            <span className="text-muted mb-0" style={{ textAlign: "left" }}>
              {moment(conversation.lastActivityAt).format("M/D/YY h:mm a")}
            </span>
          </Row>
        </Col>
      </div>
      {conversation.hasUnread && (
        <div
          className="bg-primary"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 10,
            height: 10,
            borderRadius: "50%",
          }}
        />
      )}
    </Row>
  );
};
