// src/pages/ConnectOnboardingPage.jsx
import React from "react";
import { useParams } from "react-router-dom";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
} from "@stripe/react-connect-js";
import { useStripeConnect } from "../../hooks/useStripeConnect";
import { useOffcanvas, Button, Typography } from "tabler-react-2";

export const StripeConnect = () => {
  const { eventId } = useParams();
  const { stripeConnectInstance, createStripeSession, loading, error } =
    useStripeConnect({ eventId });

  if (loading) return <div>Loading Stripe Connect…</div>;
  if (error || !stripeConnectInstance)
    return <div>Unable to initialize Stripe Connect.</div>;

  return (
    <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
      <div>
        <Typography.H5 className="mb-0 text-secondary">
          ONBOARDING
        </Typography.H5>
        <Typography.H1>Connect your Stripe account</Typography.H1>
        <ConnectAccountOnboarding
          createConnectAccountSession={createStripeSession}
        />
      </div>
    </ConnectComponentsProvider>
  );
};

export const StripeConnectTrigger = () => {
  const { offcanvas, OffcanvasElement } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1051 },
  });

  return (
    <>
      {OffcanvasElement}
      <Button onClick={() => offcanvas({ content: <StripeConnect /> })}>
        Set up your legal and payout information
      </Button>
    </>
  );
};
