import { useParams } from "react-router-dom";
import { EventPage } from "../../../../components/eventPage/EventPage";
import { StripeExpressTrigger } from "../../../../components/stripe/Connect";
import { useStripeExpress } from "../../../../hooks/useStripeExpress";
import { Empty } from "../../../../components/empty/Empty";
import { Button } from "tabler-react-2";

export const FinancialsPage = () => {
  const { eventId } = useParams();
  const { account, loading, isNew, loginUrl } = useStripeExpress({ eventId });

  return (
    <EventPage title="Financials" loading={loading}>
      <StripeExpressTrigger />
      {isNew ? "true" : "false"}
      {!isNew && (
        <Button href={loginUrl} target="_blank">
          Login to your Stripe account
        </Button>
      )}
    </EventPage>
  );
};
