import React, { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EventPage } from "../../../../../../components/eventPage/EventPage";
import { EmailTemplateCRUD } from "../../../../../../components/EmailTemplateCRUD/EmailTemplateCRUD";
import { useEmailTemplates } from "../../../../../../hooks/useEmailTemplates";

export const EventEmailTemplateCreatePage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { createEmailTemplate } = useEmailTemplates({ eventId });

  const handleSubmit = useCallback(
    async (payload) => {
      const template = await createEmailTemplate(payload);
      if (template?.id) {
        navigate(`/events/${eventId}/email/templates/${template.id}`);
        return template;
      }
      return false;
    },
    [createEmailTemplate, eventId, navigate]
  );

  return (
    <EventPage
      title="Create Email Template"
      description="Draft a new email template for this event."
    >
      <EmailTemplateCRUD onSubmit={handleSubmit} />
    </EventPage>
  );
};

export default EventEmailTemplateCreatePage;
