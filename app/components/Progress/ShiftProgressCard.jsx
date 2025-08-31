import { useParams } from "react-router-dom";
import { useEvent } from "../../hooks/useEvent";
import { ProgressCard } from "./ProgressCard";
import { Button, Typography } from "tabler-react-2";

export const ShiftProgressCard = () => {
  const { eventId } = useParams();

  return (
    <ProgressCard
      title="Create Shifts"
      icon="calendar-week"
      color="var(--tblr-teal-lt)"
    >
      <Typography.Text>
        Think of a shift as a time period during which a volunteer is working on
        a job. Most events last longer than a volunteer would like to work, so
        it is helpful to allow volunteers to sign up for shorter periods of
        time.
      </Typography.Text>
      <div style={{ marginTop: "auto" }}>
        <Typography.Text
          style={{
            fontStyle: "italic",
          }}
        >
          Volunteer registration is disabled until you have shifts set up.
        </Typography.Text>
        <Button href={`/events/${eventId}/volunteers/jobs`} outline>
          Set up shifts
        </Button>
      </div>
    </ProgressCard>
  );
};
