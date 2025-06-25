import { Typography, Button } from "tabler-react-2";
import { Icon } from "../util/Icon";
import React from "react";
import { useAuth } from ".";
import { StripeTrigger } from "../components/stripe/Stripe";
import { useEvents } from "./useEvents";
import { useParams } from "react-router-dom";
import { useLocations } from "./useLocations";
import { useTourManager } from "../components/tourManager/TourManager";

const title = (positive, negative, done) => (
  <span
    style={{
      color: done ? "initial" : "var(--tblr-danger)",
      textDecoration: done ? "line-through" : "initial",
    }}
  >
    {done ? positive : negative}
  </span>
);

const description = ({
  positive,
  negative,
  negativeOnClick,
  negativeCta,
  negativeHref,
  done,
  loading = false,
  negativeComponent,
  positiveOnClick,
  positiveCta,
  positiveComponent,
  extra,
}) =>
  done ? (
    <div>
      <Typography.Text className={"mb-0"}>{positive}</Typography.Text>
      {positiveOnClick && (
        <Button onClick={positiveOnClick} loading={loading}>
          {positiveCta}
        </Button>
      )}
      {positiveComponent}
    </div>
  ) : (
    <div>
      <Typography.Text
        className={
          negativeOnClick || negativeComponent || negativeHref ? "mb-2" : "mb-0"
        }
      >
        {negative}
      </Typography.Text>
      {extra}
      {(negativeOnClick || negativeHref) && (
        <Button onClick={negativeOnClick} loading={loading} href={negativeHref}>
          {negativeCta}
        </Button>
      )}
      {negativeComponent}
    </div>
  );

export const useWhatNextMap = () => {
  const { user, resendVerificationEmail, mutationLoading } = useAuth();
  const { createEventModal, CreateEventModalElement } = useEvents();
  const { eventId } = useParams();
  const { locations, loading: locationsLoading } = useLocations({ eventId });
  const { startTour } = useTourManager();

  const whatNextMap = (item, done) => {
    const standard = {
      iconBgColor: done ? "success" : "danger",
      time: done ? "Done" : "To-Do",
      done,
    };

    switch (item) {
      case "emailVerified":
        return {
          icon: <Icon i="mail-check" />,
          title: title("Email Verified", "Email Not Verified", done),
          description: description({
            positive: `You have verified your email address.`,
            negative: `You have not verified your email address. We need you to verify your email so we are sure we can get in touch with you!`,
            negativeOnClick: () =>
              resendVerificationEmail({ email: user.email }),
            negativeCta: "Resend Verification Email",
            done,
            loading: mutationLoading,
          }),
          ...standard,
        };

      case "goodPaymentStanding":
        return {
          icon: <Icon i="currency-dollar" />,
          title: title("Good Payment Standing", "Bad Payment Standing", done),
          description: description({
            positive:
              "You have set up a payment method and are in good payment standing.",
            negative:
              "You have not set up a payment method or have a payment method that is not accepting our charge attempts.",
            negativeComponent: (
              <StripeTrigger divProps={{ className: "text-body" }}>
                Set up a payment method
              </StripeTrigger>
            ),
            done,
          }),
          ...standard,
        };

      case "eventCount":
        return {
          icon: <Icon i="ticket" />,
          title: title("Events Created", "No Events Created Yet", done),
          description: description({
            positive: `You have created at least one event.`,
            negative: `You have not created any events yet. EventPilot sorts everything into events, so you need to create at least one event.`,
            done,
            negativeOnClick: () => createEventModal(),
            negativeCta: "Create an Event",
            extra: CreateEventModalElement,
          }),
          ...standard,
        };

      case "volunteerRegistrationForm":
        return {
          icon: <Icon i="forms" />,
          title: title(
            "Volunteer Registration Form Started",
            "Volunteer Registration Form Not Started",
            done
          ),
          description: description({
            positive: `You have started creating a volunteer registration form by adding fields.`,
            negative: `You have not started creating a volunteer registration form.`,
            done,
            negativeCta: "Go to the Registration Builder",
            negativeHref: `/events/${eventId}/builder`,
          }),
          ...standard,
        };

      case "location":
        return {
          icon: <Icon i="map-2" />,
          title: title(
            "First Location Created",
            "First Location Not Created",
            done
          ),
          description: description({
            positive: `You have created a location for volunteers to work at in the Jobs & Shifts builder.`,
            negative: `You have not created a location for volunteers to work at in the Jobs & Shifts builder.`,
            done,
            negativeCta: "Go to the Jobs & Shifts Builder",
            negativeHref: `/events/${eventId}/jobs`,
          }),
          ...standard,
        };

      case "job":
        return {
          icon: <Icon i="briefcase-2" />,
          title: title("First Job Created", "First Job Not Created", done),
          description: description({
            positive: `You have created a job for volunteers to work at in the Jobs & Shifts builder. Jobs live inside of Locations.`,
            negative: `You have not created a job for volunteers to work at in the Jobs & Shifts builder. Jobs live inside of Locations.`,
            done,
            negativeCta: "Go to the Jobs & Shifts Builder",
            negativeHref: `/events/${eventId}/jobs`,
            extra: locationsLoading
              ? null
              : locations?.length === 0 && (
                  <Typography.Text>
                    You have not created any locations yet. You need to create
                    at least one location before creating a job.
                  </Typography.Text>
                ),
          }),
          ...standard,
        };

      case "shift":
        return {
          icon: <Icon i="clock" />,
          title: title("First Shift Created", "First Shift Not Created", done),
          description: description({
            positive: `You have created a shift for volunteers to work at in the Jobs & Shifts builder. Shifts live inside of Jobs.`,
            negative: `You have not created a shift for volunteers to work at in the Jobs & Shifts builder. Shifts live inside of Jobs.`,
            done,
            negativeCta: "Go to the Jobs & Shifts Builder",
            negativeHref: `/events/${eventId}/jobs`,
            extra: locationsLoading
              ? null
              : locations?.length === 0 && (
                  <Typography.Text>
                    You have not created any locations yet. You need to create
                    at least one location and a job before creating a shift.
                  </Typography.Text>
                ),
          }),
          ...standard,
        };

      case "tour":
        return {
          icon: <Icon i="message" />,
          title: title("Tour", "Tour", done),
          description: description({
            positive: `You have taken the tour.`,
            negative: `You have not taken the tour yet.`,
            done,
            negativeOnClick: () => startTour("event_home"),
            negativeCta: "Take the tour",
            positiveOnClick: () => startTour("event_home"),
            positiveCta: "Take it again",
          }),
          ...standard,
        };

      default:
        return {
          icon: <Icon i="message" />,
          title: item,
          description: "",
          ...standard,
        };
    }
  };

  return whatNextMap;
};
