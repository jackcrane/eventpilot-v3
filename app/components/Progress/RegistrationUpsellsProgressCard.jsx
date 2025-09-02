import { useParams } from "react-router-dom";
import { ProgressCard } from "./ProgressCard";
import { Button, Typography } from "tabler-react-2";

export const RegistrationUpsellsProgressCard = ({ completed = false }) => {
  const { eventId } = useParams();

  return (
    <ProgressCard
      title="Add Upsells"
      icon="tags"
      color="var(--tblr-orange-lt)"
      completed={completed}
      cta={
        <Button href={`/events/${eventId}/registration/upsells`} outline>
          Add upsells
        </Button>
      }
    >
      <Typography.Text>
        Create optional add-ons (like T‑shirts, parking, or meals) that
        registrants can purchase during checkout.
      </Typography.Text>
    </ProgressCard>
  );
};
