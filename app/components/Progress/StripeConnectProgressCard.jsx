import { useParams } from "react-router-dom";
import { ProgressCard } from "./ProgressCard";
import { Button, Typography } from "tabler-react-2";
import { useStripeExpress } from "../../hooks/useStripeExpress";

export const StripeConnectProgressCard = ({ completed = false }) => {
  const { eventId } = useParams();
  const { startOnboarding, isLoading, loginUrl, isNew } = useStripeExpress({ eventId });

  return (
    <ProgressCard
      title="Set Up Payouts (Stripe)"
      icon="brand-stripe"
      color="var(--tblr-purple-lt)"
      completed={completed}
      cta={
        <Button onClick={startOnboarding} loading={isLoading} outline>
          Get set up with Stripe
        </Button>
      }
    >
      <Typography.Text>
        Connect a Stripe account to accept payments and receive payouts for registrations and upsells.
      </Typography.Text>
      {!completed && !isNew && loginUrl && (
        <Typography.Text>
          Already connected? <a href={loginUrl} target="_blank">Open Stripe Dashboard</a>
        </Typography.Text>
      )}
    </ProgressCard>
  );
};

