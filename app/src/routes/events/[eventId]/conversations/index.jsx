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
      {event?.useHostedEmail === false && event?.willForwardEmail === false ? (
        <Alert variant="danger" className="mt-3" title="Emails are disabled">
          <Typography.Text className="mb-0">
            Your event is configured to not use EventPilot's email inbox. This
            is because you have chosen to not use EventPilot's hosted email, and
            you have not chosen to set up a forwarding rule to forward emails to
            EventPilot from gmail or outlook.
          </Typography.Text>
        </Alert>
      ) : event?.useHostedEmail === false &&
        event?.willForwardEmail === true &&
        conversations?.length === 0 ? (
        <Alert
          variant="warning"
          className="mt-3"
          title="Emails are not set up yet"
        >
          <Typography.Text className="mb-0">
            Your event is configured to accept automatically forwarded emails
            from Gmail or Outlook, but we haven't received anything yet.
          </Typography.Text>
          <Button
            onClick={() => offcanvas({ content: <EmailForwardWizard /> })}
            variant="yellow"
            className="mt-3"
          >
            Set up forwarding
          </Button>
        </Alert>
      ) : null}

      {conversations?.length === 0 && (
        <Empty
          title="No conversations yet"
          text={`You haven't had any conversations yet. Any emails sent to ${event?.computedExternalContactEmail} will be automatically converted into conversations and appear here.`}
          ctaText="Start a conversation"
          ctaIcon="message"
        />
      )}

      {conversations?.length > 0 && (
        <Row align="flex-start" gap={2} wrap={false}>
          {showListing && (
            <HideWhenSmaller style={{ width: width < breakpoint && "100%" }}>
              <ConversationListing
                search={true}
                conversations={conversations}
                compose={true}
                fullWidth={width < breakpoint}
              />
            </HideWhenSmaller>
          )}

          {showView && (
            <div style={{ width: "100%", flex: 1 }}>
              {conversationId === "compose" ? (
                <ConversationCompose
                  onBack={width < breakpoint ? handleBack : undefined}
                />
              ) : (
                <ConversationView
                  conversationId={conversationId}
                  onBack={width < breakpoint ? handleBack : undefined}
                />
              )}
            </div>
          )}

          {!conversationId && width >= breakpoint && (
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
