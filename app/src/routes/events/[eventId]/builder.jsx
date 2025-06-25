import React from "react";
import { FormBuilder } from "../../../../components/formBuilder/FormBuilder";
import { EventPage } from "../../../../components/eventPage/EventPage";
import { useTourManager } from "../../../../components/tourManager/TourManager";

export const EventVolRegBuilder = () => {
  const { startTour } = useTourManager();
  return (
    <EventPage title="Registration Builder" tour={() => startTour("builder")}>
      <FormBuilder />
    </EventPage>
  );
};
