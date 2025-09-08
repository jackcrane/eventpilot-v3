import { useNavigate, useParams } from "react-router-dom";
import { useConversation } from "../../hooks/useConversation";
import { Loading } from "../loading/Loading";
import { Card, Typography, Util, Input, Button } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { EmailPreview } from "../emailPreview/emailPreview";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Icon } from "../../util/Icon";
import { HideWhenSmaller, ShowWhenSmaller } from "../media/Media";
import { useThread } from "../../hooks/useThread";

export const ConversationView = ({ conversationId, onBack }) => {
  const { eventId, threadId } = useParams();
  const [message, setMessage] = useState("");
  const {
    thread,
    messages,
    loading,
    sendToThread,
    mutationLoading,
    deleteThread,
    DeleteConfirmElement,
  } = useThread({ eventId, threadId });

  const handleSubmit = async () => {
    if (message === "") toast.error("You must enter a message");
    const ok = await sendToThread({ text: message });
    if (ok) setMessage("");
  };

  return (
    <div style={{ flex: 1 }}>
      {DeleteConfirmElement}
      {onBack && (
        <Button onClick={onBack} className={"mb-3"}>
          <Row gap={1} align="center">
            <Icon i="arrow-left" size={18} />
            Back to Conversations
          </Row>
        </Button>
      )}
      <Row justify="space-between" align="center">
        <div>
          <Typography.H5
            className="mb-0 text-secondary"
            style={{ textAlign: "left" }}
          >
            CONVERSATION
          </Typography.H5>
          <Typography.H1 style={{ textAlign: "left" }}>
            {thread?.subject}
          </Typography.H1>
        </div>
      </Row>
      {/* <Row gap={1} align="flex-start">
        <span className="text-muted mb-0">Participants</span>
        <Typography.Text className="mb-0">
          {[
            ...conversation?.participants?.map((p) => `${p.name} (${p.email})`),
            "EventPilot",
          ].join(", ")}
        </Typography.Text>
      </Row> */}
      <Util.Hr />
      <Card className="mb-2">
        <Typography.H2>Send a message to this conversation</Typography.H2>
        <Input
          useTextarea={true}
          label="Message"
          placeholder="Message"
          required
          value={message}
          onChange={setMessage}
        />
        <Button onClick={handleSubmit} loading={mutationLoading}>
          Send
        </Button>
      </Card>
      {messages?.map((email) => (
        <div className="mb-2" key={email.id}>
          <EmailPreview key={email.id} emailId={email.id} showIcon={true} />
        </div>
      ))}
    </div>
  );
};
