import React from "react";
import { useParams } from "react-router-dom";
import { EventPage } from "../../../../../../components/eventPage/EventPage";
import { Typography } from "tabler-react-2";

export const EventEmailTemplateCreatePage = () => {
  const { eventId } = useParams();

  return (
    <EventPage
      title="Create Email Template"
      description="Draft a new email template for this event."
    >
      <Typography.Text>
        Template creation is coming soon for event {eventId}.
      </Typography.Text>
    </EventPage>
  );
};

export default EventEmailTemplateCreatePage;
