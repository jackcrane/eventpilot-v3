import { useParams } from "react-router-dom";
import { ProgressCard } from "./ProgressCard";
import { Button, Typography } from "tabler-react-2";

export const RegistrationPricingProgressCard = () => {
  const { eventId } = useParams();

  return (
    <ProgressCard
      title="Configure Tiers & Periods"
      icon="calendar-stats"
      color="var(--tblr-yellow-lt)"
    >
      <Typography.Text>
        Set up registration tiers and time‑based price periods to control what
        you offer and how much it costs over time.
      </Typography.Text>
      <div style={{ marginTop: "auto" }}>
        <Typography.Text style={{ fontStyle: "italic" }}>
          Participant registration is disabled until you have tiers & periods
          set up.
        </Typography.Text>
        <Button href={`/events/${eventId}/registration/builder`} outline>
          Configure pricing
        </Button>
      </div>
    </ProgressCard>
  );
};
