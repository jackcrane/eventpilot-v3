import { EventPage } from "../../../../../components/eventPage/EventPage";
import { FormBuilder } from "../../../../../components/FormBuilderNew/FormBuilder";

export const RegistrationFormBuilderPage = () => {
  return (
    <EventPage
      title="Form Builder"
      description="This is where you can configure what information you wish to collect from your participants."
      showHr={false}
    >
      <FormBuilder />
    </EventPage>
  );
};
