import React from "react";
import { FormBuilder } from "../../../../components/formBuilder/FormBuilder";
import { EventPage } from "../../../../components/eventPage/EventPage";

export const EventVolRegBuilder = () => {
  return (
    <EventPage title="Registration Builder">
      <FormBuilder />
    </EventPage>
  );
};
