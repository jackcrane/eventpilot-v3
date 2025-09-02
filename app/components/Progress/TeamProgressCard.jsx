import { useParams } from "react-router-dom";
import { ProgressCard } from "./ProgressCard";
import { Button, Typography } from "tabler-react-2";

export const TeamProgressCard = ({ completed = false }) => {
  const { eventId } = useParams();

  return (
    <ProgressCard
      title="Create Teams"
      icon="users"
      color="var(--tblr-indigo-lt)"
      completed={completed}
      cta={
        <Button href={`/events/${eventId}/registration/teams`} outline>
          Create teams
        </Button>
      }
    >
      <Typography.Text>
        Create teams participants can join during registration. Teams help
        groups sign up together and simplify coordination.
      </Typography.Text>
    </ProgressCard>
  );
};

