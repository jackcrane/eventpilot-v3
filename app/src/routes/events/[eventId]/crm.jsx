import React from "react";
import { useParams } from "react-router-dom";
import { EventCrmPage } from "../../../../components/crm/EventCrmPage";

export const EventCrm = () => {
  const { eventId } = useParams();
  return <EventCrmPage eventId={eventId} />;
};
