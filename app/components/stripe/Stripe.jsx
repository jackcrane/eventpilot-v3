import { loadStripe } from "@stripe/stripe-js";
import { useStripeSetupIntent } from "../../hooks/useStripeSetupIntent";
import { useEventStripeSetupIntent } from "../../hooks/useEventStripeSetupIntent";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button, Typography, Util, Alert } from "tabler-react-2";
import React, { useState } from "react";
import { useOffcanvas } from "tabler-react-2/dist/offcanvas";
import { Loading } from "../loading/Loading";
import toast from "react-hot-toast";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PK);

const SetupForm = ({ onSuccess, buttonText = "Submit" }) => {
  const stripe = useStripe();
  const elements = useElements();

  const [errorMessage, setErrorMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    // We don't want to let default form submission happen here,
    // which would refresh the page.
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return null;
    }

    setSubmitting(true);
    const { error, setupIntent } = await stripe.confirmSetup({
      //`Elements` instance that was used to create the Payment Element
      elements,
      confirmParams: {
        return_url: "https://geteventpilot.com/events",
      },
      redirect: "if_required",
    });

    if (error) {
      // This point will only be reached if there is an immediate error when
      // confirming the payment. Show error to your customer (for example, payment
      // details incomplete)
      setErrorMessage(error.message);
      setSubmitting(false);
    } else if (setupIntent && setupIntent.status === "succeeded") {
      toast.success("Payment method added");
      try {
        onSuccess && (await onSuccess(setupIntent));
      } finally {
        setSubmitting(false);
      }
    } else {
      // For certain methods, Stripe may still redirect to return_url if required
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {errorMessage && (
        <Alert variant="danger" title={"Error"}>
          {errorMessage}
        </Alert>
      )}
      <PaymentElement />
      <Util.Hr />
      <Button
        disabled={!stripe || submitting}
        loading={submitting}
        variant="primary"
        className={"mb-3"}
      >
        {buttonText}
      </Button>
      {/* Show error message to your customers */}
      {errorMessage && (
        <Alert variant="danger" title={"Error"}>
          {errorMessage}
        </Alert>
      )}
    </form>
  );
};

export default SetupForm;

export const Stripe = ({ onSuccess, eventId }) => {
  const userSI = useStripeSetupIntent();
  const eventSI = useEventStripeSetupIntent({ eventId });
  const intent = eventId ? eventSI.intent : userSI.intent;
  const customer_session = eventId
    ? eventSI.customer_session
    : userSI.customer_session;
  const loading = eventId ? eventSI.loading : userSI.loading;

  if (loading) return <Loading />;

  return (
    <div>
      <Typography.H5 className="mb-0 text-secondary">PAYMENTS</Typography.H5>
      <Typography.H1>Set up a payment method</Typography.H1>
      <Typography.Text>
        Because of how EventPilot charges for services, we need to retain your
        payment information. When you create a new event, the monthly cost of
        the event will automatically be added to your EventPilot subscription.
        Your payment information is handled by Stripe. If you have any concerns
        about security, please contact us or visit{" "}
        <a href="https://docs.stripe.com/security">Stripe's security page</a>.
        Your payment information is encrypted both in transit and while stored,
        and is never on EventPilot's servers.
      </Typography.Text>
      <Util.Hr />
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret: intent?.client_secret,
          customerSessionClientSecret: customer_session?.client_secret,
        }}
      >
        <SetupForm onSuccess={onSuccess} />
      </Elements>
    </div>
  );
};

export const StripeTrigger = ({
  children = "Launch Billing Settings",
  type = "button", // [button, link]
  divProps,
  onSuccess,
  eventId,
  ...props
}) => {
  const { offcanvas, OffcanvasElement, close } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1051 },
  });

  return (
    <>
      {type === "button" ? (
        <Button
          onClick={() =>
            offcanvas({
              content: (
                <Stripe
                  eventId={eventId}
                  onSuccess={async (...args) => {
                    try {
                      await (onSuccess?.(...args));
                    } finally {
                      close();
                    }
                  }}
                />
              ),
            })
          }
          {...props}
        >
          {children}
        </Button>
      ) : (
        <a
          href="#"
          onClick={() =>
            offcanvas({
              content: (
                <Stripe
                  eventId={eventId}
                  onSuccess={async (...args) => {
                    try {
                      await (onSuccess?.(...args));
                    } finally {
                      close();
                    }
                  }}
                />
              ),
            })
          }
          {...props}
        >
          {children}
        </a>
      )}
      <div
        {...divProps}
        style={{
          display: "inline",
          ...divProps?.style,
        }}
      >
        {OffcanvasElement}
      </div>
    </>
  );
};
