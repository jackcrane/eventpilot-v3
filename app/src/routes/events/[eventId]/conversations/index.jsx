import { useParams } from "react-router-dom";
import { useConversations } from "../../../../../hooks/useConversations";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { Empty } from "../../../../../components/empty/Empty";
import { useEvent } from "../../../../../hooks/useEvent";
import { ConversationListing } from "../../../../../components/conversationListing/ConversationListing";
import { Row } from "../../../../../util/Flex";
import { ConversationView } from "../../../../../components/conversationView/ConversationView";

export const Conversations = () => {
  const { eventId, conversationId } = useParams();
  const { event, loading: eventLoading } = useEvent({ eventId });
  const { loading, conversations } = useConversations({ eventId });

  return (
    <EventPage title="Conversations" loading={loading || eventLoading}>
      {conversations?.length === 0 && (
        <Empty
          title="No conversations yet"
          text={`You haven't had any conversations yet. Any emails sent to (anything)@${event.slug}.geteventpilot.com will be automatically converted into conversations and appear here.`}
          ctaText="Start a conversation"
          ctaIcon="message"
        />
      )}

      {conversations?.length > 0 && (
        <>
          <Row align="flex-start" gap={2}>
            <ConversationListing conversations={conversations} />
            {conversationId && (
              <ConversationView conversationId={conversationId} />
            )}
          </Row>
        </>
      )}
    </EventPage>
  );
};
