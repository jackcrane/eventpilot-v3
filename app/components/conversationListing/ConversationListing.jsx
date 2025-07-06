import { Link, useNavigate, useParams } from "react-router-dom";
import { ConversationPreview } from "../conversationView/ConversationPreview";
import { Col, Row } from "../../util/Flex";
import { useWindowSize } from "react-use";
import { Input, Button, Util } from "tabler-react-2";
import { useState } from "react";
import { Icon } from "../../util/Icon";

export const ConversationListing = ({
  conversations,
  search: _allowSearch = false,
  compose: _allowCompose = false,
}) => {
  const { width } = useWindowSize();
  const [query, setQuery] = useState("");
  const { eventId } = useParams();
  const navigate = useNavigate();

  const search = (conversations) => {
    const lowerQuery = query.toLowerCase();

    return conversations.filter((conversation) => {
      const subjectMatch = conversation.subject
        ?.toLowerCase()
        .includes(lowerQuery);
      const participantMatch = conversation.participants.some((p) => {
        return (
          p.name?.toLowerCase().includes(lowerQuery) ||
          p.email?.toLowerCase().includes(lowerQuery)
        );
      });

      return subjectMatch || participantMatch;
    });
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <Col
        style={{ maxWidth: width < 500 ? "100%" : 300 }}
        gap={1}
        align="stretch"
      >
        {_allowSearch && (
          <div>
            <Input
              className="mb-0"
              placeholder="Search conversations"
              value={query}
              onChange={setQuery}
            />
          </div>
        )}
        {_allowCompose && (
          <Button
            onClick={() => navigate(`/events/${eventId}/conversations/compose`)}
          >
            <Row gap={1} align="center">
              <Icon i="message-plus" />
              Compose a new conversation
            </Row>
          </Button>
        )}
        {(_allowSearch || _allowCompose) && <Util.Hr />}
        {search(conversations).map((convo) => (
          <Link to={`/events/${convo.eventId}/conversations/${convo.id}`}>
            <ConversationPreview key={convo.id} conversation={convo} />
          </Link>
        ))}
      </Col>
    </div>
  );
};
