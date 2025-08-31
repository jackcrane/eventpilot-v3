import { useParams } from "react-router-dom";
import { useEvent } from "../../hooks/useEvent";
import { ProgressCard } from "./ProgressCard";
import { Button, Typography } from "tabler-react-2";

export const JobProgressCard = () => {
  const { eventId } = useParams();

  return (
    <ProgressCard
      title="Create Jobs"
      icon="briefcase-2"
      color="var(--tblr-blue-lt)"
    >
      <Typography.Text>
        Think of a job as a distinct task that needs to be done. For example, if
        you are hosting a conference, you might have a job for ushers to help
        attendees find their seats, a job to help speakers get ready for their
        talk, and a job to help make sure the food table is stocked.
      </Typography.Text>
      <div style={{ marginTop: "auto" }}>
        <Button href={`/events/${eventId}/volunteers/jobs`} outline>
          Set up jobs
        </Button>
        <Typography.Text
          className="mt-3 mb-0"
          style={{
            fontStyle: "italic",
          }}
        >
          Volunteer registration is disabled until you have jobs set up.
        </Typography.Text>
      </div>
    </ProgressCard>
  );
};
