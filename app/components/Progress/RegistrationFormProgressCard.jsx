import { useParams } from "react-router-dom";
import { ProgressCard } from "./ProgressCard";
import { Button, Typography } from "tabler-react-2";

export const RegistrationFormProgressCard = ({ completed = false }) => {
  const { eventId } = useParams();

  return (
    <ProgressCard
      title="Participant Registration Form"
      icon="forms"
      color="var(--tblr-indigo-lt)"
      completed={completed}
      cta={
        <>
          <Typography.Text style={{ fontStyle: "italic" }}>
            Participant registration is disabled until you have forms set up.
          </Typography.Text>
          <Button href={`/events/${eventId}/registration/form-builder`} outline>
            Build the form
          </Button>
        </>
      }
    >
      <Typography.Text>
        Build the participant registration form to collect attendee details like
        name, email, and any custom questions you need.
      </Typography.Text>
    </ProgressCard>
  );
};
