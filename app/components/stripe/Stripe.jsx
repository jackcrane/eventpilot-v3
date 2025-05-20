import { loadStripe } from "@stripe/stripe-js";
import { useStripeSetupIntent } from "../../hooks/useStripeSetupIntent";
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

const stripePromise = loadStripe(
  "pk_test_51M1Dy1IZm3Kzv7N0EoaTOWUyxPLDkS3wT5MRVb6vtuMx5OxAIQPhwVmAi9jZbpvfHQdKxDAR6qI6LgqiYlxxEDSD002yLSE0rV"
);

const SetupForm = () => {
  const stripe = useStripe();
  const elements = useElements();

  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (event) => {
    // We don't want to let default form submission happen here,
    // which would refresh the page.
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return null;
    }

    const { error } = await stripe.confirmSetup({
      //`Elements` instance that was used to create the Payment Element
      elements,
      confirmParams: {
        return_url: "https://example.com/account/payments/setup-complete",
      },
    });

    if (error) {
      // This point will only be reached if there is an immediate error when
      // confirming the payment. Show error to your customer (for example, payment
      // details incomplete)
      setErrorMessage(error.message);
    } else {
      // Your customer will be redirected to your `return_url`. For some payment
      // methods like iDEAL, your customer will be redirected to an intermediate
      // site first to authorize the payment, then redirected to the `return_url`.
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
      <Button disabled={!stripe} variant="primary" className={"mb-3"}>
        Submit
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

export const Stripe = () => {
  const { intent, customer_session, loading } = useStripeSetupIntent();

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
        <SetupForm />
      </Elements>
    </div>
  );
};

export const StripeTrigger = ({
  children = "Launch Billing Settings",
  type = "button", // [button, link]
  divProps,
  ...props
}) => {
  const { offcanvas, OffcanvasElement } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500 },
  });

  return (
    <>
      {type === "button" ? (
        <Button onClick={() => offcanvas({ content: <Stripe /> })} {...props}>
          {children}
        </Button>
      ) : (
        <a
          href="#"
          onClick={() => offcanvas({ content: <Stripe /> })}
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
