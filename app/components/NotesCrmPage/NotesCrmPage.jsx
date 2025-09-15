import React from "react";
import { useParams } from "react-router-dom";
import { NotesCrm } from "../NotesCrm/NotesCrm";

export const NotesCrmPage = ({ crmPerson }) => {
  const { eventId, personId } = useParams();
  return <NotesCrm eventId={eventId} personId={personId} />;
};
