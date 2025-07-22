// src/pages/ConversationPage/ConversationPage.js
import React from "react";
import { useParams } from "react-router-dom";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { useConversation } from "../../../../../hooks/useConversation";
import { Typography, Util } from "tabler-react-2";
import { ConversationTimeline } from "../../../../../components/ConversationTimeline/ConversationTimeline";
import { ConversationPageLayout } from "../../../../../components/ConversationPageLayout/ConversationPageLayout";

export const ConversationPage = () => {
  const { eventId, conversationId } = useParams();
  const { conversation, loading } = useConversation({
    eventId,
    conversationId,
  });

  return (
    <EventPage loading={loading}>
      <Typography.H2>{conversation?.subject}</Typography.H2>
      <ConversationPageLayout
        timeline={<ConversationTimeline emails={conversation?.emails} />}
        participants={conversation?.participants}
      />
    </EventPage>
  );
};
