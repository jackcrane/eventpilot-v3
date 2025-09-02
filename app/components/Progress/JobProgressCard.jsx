import { useParams } from "react-router-dom";
import { useEvent } from "../../hooks/useEvent";
import { ProgressCard } from "./ProgressCard";
import { Button, Typography } from "tabler-react-2";

export const JobProgressCard = ({ completed = false }) => {
  const { eventId } = useParams();

  return (
    <ProgressCard
      title="Create Jobs"
      icon="briefcase-2"
      color="var(--tblr-blue-lt)"
      completed={completed}
      cta={
        <>
          <Typography.Text
            style={{
              fontStyle: "italic",
            }}
          >
            Volunteer registration is disabled until you have jobs set up.
          </Typography.Text>
          <Button href={`/events/${eventId}/volunteers/jobs`} outline>
            Set up jobs
          </Button>
        </>
      }
    >
      <Typography.Text>
        Think of a job as a distinct task that needs to be done. For example, if
        you are hosting a conference, you might have a job for ushers to help
        attendees find their seats, a job to help speakers get ready for their
        talk, and a job to help make sure the food table is stocked.
      </Typography.Text>
    </ProgressCard>
  );
};
