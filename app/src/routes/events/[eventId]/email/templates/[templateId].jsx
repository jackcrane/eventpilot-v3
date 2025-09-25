import React, { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Typography } from "tabler-react-2";
import { EventPage } from "../../../../../../components/eventPage/EventPage";
import { EmailTemplateCRUD } from "../../../../../../components/EmailTemplateCRUD/EmailTemplateCRUD";
import { useEmailTemplate } from "../../../../../../hooks/useEmailTemplate";

export const EventEmailTemplateDetailPage = () => {
  const { eventId, templateId } = useParams();
  const navigate = useNavigate();

  const {
    template,
    loading,
    error,
    updateEmailTemplate,
  } = useEmailTemplate({ eventId, templateId });

  const handleSubmit = useCallback(
    async (payload) => {
      const ok = await updateEmailTemplate(payload);
      return ok;
    },
    [updateEmailTemplate]
  );

  const title = template?.name || (loading ? "Loading template" : "Email Template");

  return (
    <EventPage
      title={title}
      description="Edit the template contents, variables, and name."
      loading={loading}
    >
      {error && !loading ? (
        <Typography.Text className="text-danger">
          Failed to load template. Please return to the list and try again.
        </Typography.Text>
      ) : (
        <EmailTemplateCRUD
          template={template}
          loading={loading}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/events/${eventId}/email/templates`)}
        />
      )}
    </EventPage>
  );
};

export default EventEmailTemplateDetailPage;
