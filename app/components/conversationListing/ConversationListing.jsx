import { Link } from "react-router-dom";
import { ConversationPreview } from "../conversationView/ConversationPreview";
import { Col } from "../../util/Flex";
import { useWindowSize } from "react-use";
import { Input } from "tabler-react-2";
import { useState } from "react";

export const ConversationListing = ({
  conversations,
  search: _allowSearch,
}) => {
  const { width } = useWindowSize();
  const [query, setQuery] = useState("");

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
          <div
            style={{
              position: "sticky",
            }}
          >
            <Input
              className="mb-0"
              placeholder="Search conversations"
              value={query}
              onChange={setQuery}
            />
          </div>
        )}
        {search(conversations).map((convo) => (
          <Link to={`/events/${convo.eventId}/conversations/${convo.id}`}>
            <ConversationPreview key={convo.id} conversation={convo} />
          </Link>
        ))}
      </Col>
    </div>
  );
};
