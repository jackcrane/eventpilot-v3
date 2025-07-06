import { Button, Card, Typography, Input } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { Icon } from "../../util/Icon";
import { useState } from "react";
import { useConversations } from "../../hooks/useConversations";
import { useParams } from "react-router-dom";

export const ConversationCompose = ({ onBack }) => {
  const { eventId } = useParams();
  const { mutationLoading, createConversation } = useConversations({
    eventId,
  });
  const [subject, setSubject] = useState("");
  const [textBody, setTextBody] = useState("");
  const [to, setTo] = useState("");

  return (
    <div>
      {onBack && (
        <Button onClick={onBack} className={"mb-3"}>
          <Row gap={1} align="center">
            <Icon i="arrow-left" size={18} />
            Back to Conversations
          </Row>
        </Button>
      )}
      <div>
        <Typography.H5
          className="mb-0 text-secondary"
          style={{ textAlign: "left" }}
        >
          CONVERSATION
        </Typography.H5>
        <Typography.H1 style={{ textAlign: "left" }}>
          Compose a new conversation
        </Typography.H1>
      </div>
      <Card className="mb-2">
        <Input
          label="To"
          placeholder="Message"
          required
          value={to}
          onChange={setTo}
        />
        <Input
          label="Subject"
          placeholder="Message"
          required
          value={subject}
          onChange={setSubject}
        />
        <Input
          label="Message"
          placeholder="Message"
          required
          value={textBody}
          onChange={setTextBody}
          useTextarea={true}
        />
        <Button
          onClick={() =>
            createConversation({
              to,
              subject,
              text: textBody,
            })
          }
          loading={false}
          variant="primary"
          className="mt-3"
        >
          Send
        </Button>
      </Card>
    </div>
  );
};
