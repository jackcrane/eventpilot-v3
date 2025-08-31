import { useParams } from "react-router-dom";
import { ProgressCard } from "./ProgressCard";
import { Button, Typography } from "tabler-react-2";

export const RegistrationUpsellsProgressCard = () => {
  const { eventId } = useParams();

  return (
    <ProgressCard title="Add Upsells" icon="tags" color="var(--tblr-orange-lt)">
      <Typography.Text>
        Create optional add-ons (like T‑shirts, parking, or meals) that
        registrants can purchase during checkout.
      </Typography.Text>
      <div style={{ marginTop: "auto" }}>
        <Button href={`/events/${eventId}/registration/upsells`} outline>
          Add upsells
        </Button>
      </div>
    </ProgressCard>
  );
};
