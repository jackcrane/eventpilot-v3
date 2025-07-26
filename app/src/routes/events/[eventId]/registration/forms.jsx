import { useParams } from "react-router-dom";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { FormBuilder } from "../../../../../components/FormBuilderNew/FormBuilder";
import { useParticipantRegistrationForm } from "../../../../../hooks/useParticipantRegistrationForm";

export const RegistrationFormBuilderPage = () => {
  const { eventId } = useParams();
  const { fields, loading, error, updateFields, mutationLoading } =
    useParticipantRegistrationForm({
      eventId,
    });

  return (
    <EventPage
      title="Form Builder"
      description="This is where you can configure what information you wish to collect from your participants."
      showHr={false}
      loading={loading}
    >
      <FormBuilder
        onSave={updateFields}
        initialValues={fields}
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
        ]}
      />
    </EventPage>
  );
};
