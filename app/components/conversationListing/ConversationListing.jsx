import { Link } from "react-router-dom";
import { ConversationPreview } from "../conversationView/ConversationPreview";
import { Col } from "../../util/Flex";

export const ConversationListing = ({ conversations }) => {
  return (
    <Col style={{ maxWidth: 300 }} gap={1} align="stretch">
      {conversations.map((convo) => (
        <Link to={`/events/${convo.eventId}/conversations/${convo.id}`}>
          <ConversationPreview key={convo.id} conversation={convo} />
        </Link>
      ))}
    </Col>
  );
};
