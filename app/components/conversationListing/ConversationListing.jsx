import { Link, useNavigate, useParams } from "react-router-dom";
import { ConversationPreview } from "../conversationView/ConversationPreview";
import { Col, Row } from "../../util/Flex";
import { useWindowSize } from "react-use";
import { Input, Button, Util, Typography } from "tabler-react-2";
import { useEffect, useState } from "react";
import { Icon } from "../../util/Icon";
import { useThread } from "../../hooks/useThread";

export const ConversationListing = ({
  conversations,
  search: _allowSearch = false,
  compose: _allowCompose = false,
  fullWidth = false,
}) => {
  const [query, setQuery] = useState("");
  const { eventId } = useParams();

  const search = (threads) => {
    // const lowerQuery = query.toLowerCase();
    // return threads.filter((thread) => {
    //   const subjectMatch = thread.subject?.toLowerCase().includes(lowerQuery);
    //   const participantMatch = thread.participants.some((p) => {
    //     return (
    //       p.name?.toLowerCase().includes(lowerQuery) ||
    //       p.email?.toLowerCase().includes(lowerQuery)
    //     );
    //   });
    //   let sentMatch = true;
    //   if (!allowSent) {
    //     sentMatch = thread.sent === allowSent;
    //   }
    //   return (subjectMatch || participantMatch) && sentMatch;
    // });
    return threads;
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <Col gap={1} align="stretch">
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
        {/* {_allowSearch && <Util.Hr />}
        <Button onClick={() => setAllowSent(!allowSent)}>
          <Row gap={1} align="center">
            {allowSent
              ? "Show received conversations only"
              : "Include sent conversations"}
          </Row>
        </Button>
        {(_allowSearch || _allowCompose) && <Util.Hr />} */}

        {/* <Typography.Text className="text-muted mb-0">
          {search(conversations).length === conversations.length
            ? `Showing all ${conversations.length} conversations`
            : `Showing ${search(conversations).length} of ${
                conversations.length
              } conversations`}
        </Typography.Text> */}

        {search(conversations).map((convo) => (
          <Link to={`/events/${eventId}/conversations/${convo.id}`}>
            <ConversationPreview key={convo.id} conversation={convo} />
          </Link>
        ))}

        {search(conversations).length < conversations.length && (
          <>
            <Util.Hr />
            <Typography.Text className="text-muted">
              {conversations.length - search(conversations).length}{" "}
              conversations are hidden by your search query or filters.
            </Typography.Text>
            <Typography.Text className="text-muted">
              If you are expecting to see more conversations, try{" "}
              <a
                onClick={() => setAllowSent(true)}
                href={"javascript: () => null"}
              >
                showing all conversations, including sent ones
              </a>
              , or try{" "}
              <a onClick={() => setQuery("")} href={"javascript: () => null"}>
                clearing your search query
              </a>
              .
            </Typography.Text>
          </>
        )}
      </Col>
    </div>
  );
};
