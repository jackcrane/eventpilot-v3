import React from "react";
import { FormBuilder } from "../../../../components/formBuilder/FormBuilder";
import { EventPage } from "../../../../components/eventPage/EventPage";
import { useTourManager } from "../../../../components/tourManager/TourManager";

export const EventVolRegBuilder = () => {
  const { startTour } = useTourManager();
  return (
    <EventPage
      title="Registration Builder"
      tour={() => startTour("builder")}
      docsLink={
        "https://docs.geteventpilot.com/docs/pages/registration-builder/"
      }
      description={
        "This is the Registration Builder. It allows you to customize what data you want to collect from your volunteers by customizing the registration form."
      }
    >
      <FormBuilder />
    </EventPage>
  );
};
