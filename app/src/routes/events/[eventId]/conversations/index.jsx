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
import { Typography, Alert, useOffcanvas, Button } from "tabler-react-2";
import { ConversationCompose } from "../../../../../components/conversationView/ConversationCompose";
import { EmailForwardWizard } from "../../../../../components/EmailForwardWizard/EmailForwardWizard";
import { TriPanelLayout } from "../../../../../components/TriPanelLayout/TriPanelLayout";

export const Conversations = () => {
  const { eventId, conversationId } = useParams();
  const navigate = useNavigate();
  const { width } = useWindowSize();
  const { event, loading: eventLoading } = useEvent({ eventId });
  const { loading, conversations } = useConversations({ eventId });
  const { offcanvas, OffcanvasElement } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1051 },
  });

  const handleBack = () => {
    navigate(`/events/${eventId}/conversations`);
  };

  const breakpoint = 950;
  const showListing = !conversationId || width >= breakpoint;
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
            Any emails sent to {event?.computedExternalContactEmail} will be
            visible here.
          </i>
        </>
      }
    >
      {OffcanvasElement}

      {conversations?.length === 0 && (
        <Empty
          title="No conversations yet"
          text={`You haven't had any conversations yet. Any emails sent to ${event?.computedExternalContactEmail} will be automatically converted into conversations and appear here.`}
          ctaText="Start a conversation"
          ctaIcon="message"
        />
      )}

      {conversations?.length > 0 && (
        <TriPanelLayout
          leftTitle={"Conversations"}
          leftChildren={
            <ConversationListing
              search={true}
              conversations={conversations}
              compose={true}
            />
          }
          centerTitle={"Conversation"}
          centerChildren={
            conversationId === "compose" ? (
              <ConversationCompose />
            ) : (
              <ConversationView conversationId={conversationId} />
            )
          }
          rightTitle={"Compose"}
          rightChildren={"Placeholder"}
        />
      )}
    </EventPage>
  );
};
