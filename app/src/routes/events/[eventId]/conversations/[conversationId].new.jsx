// src/pages/ConversationPage/ConversationPage.js
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { useConversation } from "../../../../../hooks/useConversation";
import { Typography, Util, Button } from "tabler-react-2";
import { ConversationTimeline } from "../../../../../components/ConversationTimeline/ConversationTimeline";
import { ConversationPageLayout } from "../../../../../components/ConversationPageLayout/ConversationPageLayout";
import { Row } from "../../../../../util/Flex";
import { Icon } from "../../../../../util/Icon";
import { ConversationCompose } from "../../../../../components/conversationView/ConversationCompose";

export const ConversationPage = () => {
  const { eventId, conversationId } = useParams();
  const { conversation, loading } = useConversation({
    eventId,
    conversationId,
  });
  const navigate = useNavigate();

  return (
    <EventPage loading={loading}>
      <Typography.H2>{conversation?.subject}</Typography.H2>
      <Row gap={2} align="center" className="mb-2">
        <Button
          onClick={() => navigate(`/events/${eventId}/conversations`)}
          className="p-1"
          size="sm"
        >
          <Icon i="arrow-left" />
          Back to other conversations
        </Button>
        {conversation && <span>Conversation created via Email</span>}
      </Row>
      {conversationId === "compose" ? (
        <ConversationCompose />
      ) : (
        <ConversationPageLayout
          timeline={<ConversationTimeline emails={conversation?.emails} />}
          participants={conversation?.participants}
          conversationId={conversationId}
        />
      )}
    </EventPage>
  );
};
