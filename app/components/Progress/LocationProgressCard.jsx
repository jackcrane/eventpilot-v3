import { useParams } from "react-router-dom";
import { useEvent } from "../../hooks/useEvent";
import { ProgressCard } from "./ProgressCard";
import { Button, Typography } from "tabler-react-2";

export const LocationProgressCard = ({ completed = false }) => {
  const { eventId } = useParams();

  return (
    <ProgressCard
      title="Create Locations"
      icon="map-pin"
      color="var(--tblr-pink-lt)"
      completed={completed}
      cta={
        <>
          <Typography.Text
            style={{
              fontStyle: "italic",
            }}
          >
            Volunteer registration is disabled until you have locations set up.
          </Typography.Text>
          <Button href={`/events/${eventId}/volunteers/jobs`} outline>
            Set up locations
          </Button>
        </>
      }
    >
      <Typography.Text>
        Think of a location as an independent time and space where volunteers
        can work. You can have as many locations as you want, and they are a
        great way to communicate seperate units of work to your volunteers.
      </Typography.Text>
    </ProgressCard>
  );
};
