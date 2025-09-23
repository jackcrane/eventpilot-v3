import React from "react";
import { useParams } from "react-router-dom";
import { EventPage } from "../../../../../../components/eventPage/EventPage";
import { Typography } from "tabler-react-2";

export const EventEmailTemplateDetailPage = () => {
  const { templateId } = useParams();

  return (
    <EventPage
      title="Email Template"
      description="Template details will be available soon."
    >
      <Typography.Text>
        Placeholder for template {templateId}.
      </Typography.Text>
    </EventPage>
  );
};

export default EventEmailTemplateDetailPage;
