import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

// Back-compat: redirect the old /settings route to /settings/basics
export const EventSettings = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    navigate(`/events/${eventId}/settings/basics`, { replace: true });
  }, [eventId, navigate]);
  return null;
};
