import React from "react";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { Stripe } from "../../../../../components/stripe/Stripe";

export const EventSettingsBillingPage = () => {
  return (
    <EventPage title="Settings · Billing" description="Manage how you pay EventPilot (account billing).">
      <Stripe />
    </EventPage>
  );
};

