import { useParams } from "react-router-dom";
import { EventPage } from "../../../../components/eventPage/EventPage";
import {
  StripeConnect,
  StripeConnectTrigger,
} from "../../../../components/stripe/Connect";
import { useStripeConnect } from "../../../../hooks/useStripeConnect";
import { Empty } from "../../../../components/empty/Empty";

export const FinancialsPage = () => {
  const { eventId } = useParams();
  const { account, loading } = useStripeConnect({ eventId });

  return (
    <EventPage title="Financials" loading={loading}>
      {account?.details_submitted ? (
        <div>Account details submitted</div>
      ) : (
        <Empty
          text="You haven't submitted your legal details yet."
          ctaElement={<StripeConnectTrigger />}
          gradient={false}
        />
      )}
    </EventPage>
  );
};
