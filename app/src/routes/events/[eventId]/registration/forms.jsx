import { useParams } from "react-router-dom";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { FormBuilder } from "../../../../../components/FormBuilder.v2/FormBuilder";
import { useParticipantRegistrationForm } from "../../../../../hooks/useParticipantRegistrationForm";
import { useRegistrationUpsells } from "../../../../../hooks/useRegistrationUpsells";

export const RegistrationFormBuilderPage = () => {
  const { eventId } = useParams();
  const { pages, loading, error, updatePages, mutationLoading } =
    useParticipantRegistrationForm({
      eventId,
    });
  const { upsells, loading: upsellsLoading } = useRegistrationUpsells({
    eventId,
  });

  return (
    <EventPage
      title="Form Builder"
      description="This is where you can configure what information you wish to collect from your participants."
      showHr={false}
      loading={loading || upsellsLoading}
    >
      <FormBuilder
        onSave={updatePages}
        initialValues={pages}
        loading={mutationLoading}
        error={error}
        requiredFieldTypes={[
          {
            id: "participantName",
            baseType: "text",
            label: "Participant Name",
            description: "The name of the participant",
            icon: "id-badge-2",
            iconColor: "var(--tblr-blue)",
          },
          {
            id: "participantEmail",
            baseType: "email",
            label: "Participant Email",
            description: "The email of the participant",
            icon: "mail",
            iconColor: "var(--tblr-purple)",
          },
          {
            id: "registrationtier",
            label: "Registration Tier",
            description: "Display a dropdown to collect a single answer.",
            icon: "ticket",
            iconColor: "var(--tblr-orange)",
            supports: [],
            defaults: {
              prompt: "Select an option...",
              options: [],
            },
          },
          upsells?.length > 0 && {
            id: "upsells",
            label: "Upsells",
            description: "Display a list of available upsells.",
            icon: "gift",
            iconColor: "var(--tblr-blue)",
            supports: [],
            defaults: {
              prompt: "Select an option...",
              options: [],
            },
          },
        ].filter(Boolean)}
      />
    </EventPage>
  );
};
