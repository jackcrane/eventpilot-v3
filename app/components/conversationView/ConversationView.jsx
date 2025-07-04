import { useParams } from "react-router-dom";
import { useConversation } from "../../hooks/useConversation";
import { Loading } from "../loading/Loading";
import { Card, Typography, Util } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { EmailPreview } from "../emailPreview/emailPreview";

export const ConversationView = ({ conversationId }) => {
  const { eventId } = useParams();
  const { conversation, loading } = useConversation({
    eventId,
    conversationId,
  });

  if (loading) return <Loading gradient={false} />;

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
      {conversation?.emails.map((email) => (
        <div className="mb-2" key={email.id}>
          <EmailPreview key={email.id} emailId={email.id} showIcon={true} />
        </div>
      ))}
    </div>
  );
};
