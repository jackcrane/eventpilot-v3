import React from "react";
import { Button } from "tabler-react-2";
import { useParams } from "react-router-dom";
import { useStripeExpress } from "../../hooks/useStripeExpress";

export function StripeExpressTrigger() {
  const { eventId } = useParams();
  const { startOnboarding, isLoading } = useStripeExpress({ eventId });

  return (
    <>
      <Button loading={isLoading} onClick={startOnboarding}>
        Get set up with Stripe
      </Button>
    </>
  );
}
