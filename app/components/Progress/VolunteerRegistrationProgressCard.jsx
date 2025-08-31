import { useParams } from "react-router-dom";
import { useEvent } from "../../hooks/useEvent";
import { ProgressCard } from "./ProgressCard";
import { Button, Typography } from "tabler-react-2";

export const VolunteerRegistrationProgressCard = () => {
  const { eventId } = useParams();
  const { event, loading: eventLoading } = useEvent({ eventId });

  if (eventLoading) return null;

  return (
    <ProgressCard
      title="Volunteer Registration Form"
      icon="heart"
      color="var(--tblr-red-lt)"
    >
      <Typography.Text>
        The volunteer registration builder is a tool in EventPilot that allows
        you to customize what data you want to collect from your volunteers.
      </Typography.Text>
      <Typography.Text>
        Once you have built your form, volunteers will be able to visit{" "}
        <a
          href={`https://${event.slug}.geteventpilot.com/volunteer`}
          target="_blank"
        >
          https://{event.slug}.geteventpilot.com/volunteer
        </a>{" "}
        to sign up to help with your event.
      </Typography.Text>
      <div style={{ marginTop: "auto" }}>
        <Typography.Text
          style={{
            fontStyle: "italic",
          }}
        >
          Volunteer registration is disabled until you have shifts set up.
        </Typography.Text>
        <Button href={`/events/${eventId}/volunteers/builder`} outline>
          Build the form
        </Button>
      </div>
    </ProgressCard>
  );
};
