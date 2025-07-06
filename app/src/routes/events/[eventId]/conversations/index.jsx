import { useParams, useNavigate } from "react-router-dom";
import { useConversations } from "../../../../../hooks/useConversations";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { Empty } from "../../../../../components/empty/Empty";
import { useEvent } from "../../../../../hooks/useEvent";
import { ConversationListing } from "../../../../../components/conversationListing/ConversationListing";
import { Row } from "../../../../../util/Flex";
import { ConversationView } from "../../../../../components/conversationView/ConversationView";
import {
  HideWhenSmaller,
  ShowWhenSmaller,
} from "../../../../../components/media/Media";
import { useWindowSize } from "react-use";
import { Typography } from "tabler-react-2";
import { ConversationCompose } from "../../../../../components/conversationView/ConversationCompose";

export const Conversations = () => {
  const { eventId, conversationId } = useParams();
  const navigate = useNavigate();
  const { width } = useWindowSize();
  const { event, loading: eventLoading } = useEvent({ eventId });
  const { loading, conversations } = useConversations({ eventId });

  const handleBack = () => {
    navigate(`/events/${eventId}/conversations`);
  };

  const showListing = !conversationId || width >= 500;
  const showView = conversationId !== undefined;

  return (
    <EventPage
      title="Conversations"
      loading={loading || eventLoading}
      description={
        <>
          <Typography.Text className="mb-1">
            This is the conversations page. It is an email inbox for the email
            address EventPilot manages for your event.
          </Typography.Text>
          <i>
            Any emails sent to (anything)@{event?.slug}.geteventpilot.com will
            be visible here.
          </i>
        </>
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
        <Row align="flex-start" gap={2} wrap={false}>
          {showListing && (
            <HideWhenSmaller style={{ width: width < 500 && "100%" }}>
              <ConversationListing
                search={true}
                conversations={conversations}
                compose={true}
              />
            </HideWhenSmaller>
          )}

          {showView && (
            <div style={{ width: "100%", flex: 1 }}>
              {conversationId === "compose" ? (
                <ConversationCompose
                  onBack={width < 500 ? handleBack : undefined}
                />
              ) : (
                <ConversationView
                  conversationId={conversationId}
                  onBack={width < 500 ? handleBack : undefined}
                />
              )}
            </div>
          )}

          {!conversationId && width >= 500 && (
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
