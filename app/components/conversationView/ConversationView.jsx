import { useParams } from "react-router-dom";
import { useConversation } from "../../hooks/useConversation";
import { Loading } from "../loading/Loading";
import { Card, Typography, Util, Input, Button } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { EmailPreview } from "../emailPreview/emailPreview";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export const ConversationView = ({ conversationId }) => {
  const { eventId } = useParams();
  const { conversation, loading, sendMessage, mutationLoading } =
    useConversation({
      eventId,
      conversationId,
    });
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");

  let setToToDefaultFirstEmail = () => {
    let inboundEmails = conversation?.emails?.filter(
      (email) => email.type === "INBOUND"
    );
    const originalSender =
      inboundEmails?.[inboundEmails.length - 1]?.from?.email;
    setTo(originalSender);
  };

  useEffect(() => {
    setToToDefaultFirstEmail();
  }, [conversation]);

  if (loading) return <Loading gradient={false} />;

  const handleSubmit = async () => {
    if (to === "") toast.error("You must enter a recipient");
    // Make sure the to is an email
    if (!to.includes("@")) toast.error("You must enter a valid email");
    if (message === "") toast.error("You must enter a message");

    const ok = await sendMessage(message, to);
    if (ok) {
      setToToDefaultFirstEmail();
      setMessage("");
    }
  };

  return (
    <div style={{ flex: 1 }}>
      <Typography.H5 className="mb-0 text-secondary">
        CONVERSATION
      </Typography.H5>
      <Typography.H1>{conversation?.subject}</Typography.H1>
      <Row gap={1}>
        <span className="text-muted mb-0">Participants</span>
        <Typography.Text className="mb-0">
          {[
            ...conversation?.participants.map((p) => `${p.name} (${p.email})`),
            "EventPilot",
          ].join(", ")}
        </Typography.Text>
      </Row>
      <Util.Hr />
      <Card className="mb-2">
        <Typography.H2>Send a message to this conversation</Typography.H2>
        <Input
          label="To"
          placeholder="Message"
          required
          value={to}
          onChange={setTo}
        />
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
      {conversation?.emails.map((email) => (
        <div className="mb-2" key={email.id}>
          <EmailPreview key={email.id} emailId={email.id} showIcon={true} />
        </div>
      ))}
    </div>
  );
};
