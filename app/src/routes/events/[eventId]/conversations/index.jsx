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
    <EventPage
      title="Conversations"
      loading={loading || eventLoading}
      description={
        "This is the conversations page. It is an email inbox for the email address EventPilot manages for your event."
      }
    >
      {conversations?.length === 0 && (
        <Empty
          title="No conversations yet"
          text={`You haven't had any conversations yet. Any emails sent to (anything)@${event.slug}.geteventpilot.com will be automatically converted into conversations and appear here.`}
          ctaText="Start a conversation"
          ctaIcon="message"
        />
      )}

      {conversations?.length > 0 && (
        <Row align="flex-start" gap={2}>
          <ConversationListing conversations={conversations} />
          {conversationId ? (
            <ConversationView conversationId={conversationId} />
          ) : (
            <div style={{ width: "100%", flex: 1 }}>
              <Empty
                gradient={false}
                title="Pick a conversation"
                icon="message"
                text="Pick a conversation from the list on the left to view."
              />
            </div>
          )}
        </Row>
      )}
    </EventPage>
  );
};
