import React from "react";
import { EventPage } from "../../../../components/eventPage/EventPage";
import { FormBuilder } from "../../../../components/formBuilder/FormBuilder";

export const EventBuilder = () => {
  return (
    <EventPage title="Registration Builder">
      <FormBuilder />
    </EventPage>
  );
};
