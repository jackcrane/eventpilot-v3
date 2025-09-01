import React from "react";
import { FormBuilder } from "../../../../components/FormBuilder.v2/FormBuilder";
import { EventPage } from "../../../../components/eventPage/EventPage";
import { useTourManager } from "../../../../components/tourManager/TourManager";
import { useVolunteerRegistrationFormV2 } from "../../../../hooks/useVolunteerRegistrationFormV2";
import { useParams } from "react-router-dom";

export const EventVolRegBuilder = () => {
  const { startTour } = useTourManager();
  const { eventId } = useParams();
  const { pages, loading, error, updatePages, mutationLoading } =
    useVolunteerRegistrationFormV2({ eventId });

  return (
    <EventPage
      title="Registration Builder"
      tour={() => startTour("builder")}
      docsLink={
        "https://docs.geteventpilot.com/docs/pages/registration-builder/"
      }
      description={
        "Customize the volunteer registration form. Name and Email are required."
      }
      loading={loading}
    >
      <FormBuilder
        onSave={updatePages}
        initialValues={pages}
        loading={mutationLoading}
        requiredFieldTypes={[
          {
            id: "volunteerName",
            baseType: "text",
            label: "Your Name",
            description: "The volunteer's name",
            icon: "id-badge-2",
            iconColor: "var(--tblr-blue)",
          },
          {
            id: "volunteerEmail",
            baseType: "email",
            label: "Your Email",
            description: "The volunteer's email",
            icon: "mail",
            iconColor: "var(--tblr-purple)",
          },
          {
            id: "shiftpicker",
            label: "Shifts",
            description: "Let volunteers pick locations, jobs, and shifts.",
            icon: "calendar-event",
            iconColor: "var(--tblr-green)",
            supports: [],
            defaults: {},
          },
        ]}
      />
    </EventPage>
  );
};
