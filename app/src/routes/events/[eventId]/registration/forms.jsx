import { EventPage } from "../../../../../components/eventPage/EventPage";
import { TriPanelLayout } from "../../../../../components/TriPanelLayout/TriPanelLayout";

export const RegistrationFormBuilderPage = () => {
  return (
    <EventPage
      title="Form Builder"
      description="This is where you can configure what information you wish to collect from your participants."
      showHr={false}
    >
      <TriPanelLayout
        leftIcon="palette"
        leftTitle="Palette"
        leftChildren={<div>Step 1</div>}
        centerIcon="forms"
        centerTitle="Form Preview"
        centerChildren={<div>Step 2</div>}
        centerContentClassName="bg-gray-100 polka"
        centerContentProps={{ style: { padding: 9, margin: -9 } }}
        rightIcon="adjustments-alt"
        rightTitle="Field Settings"
        rightChildren={<div>Step 3</div>}
      />
    </EventPage>
  );
};
