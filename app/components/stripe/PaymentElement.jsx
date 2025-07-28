import {
  PaymentElement as StripePaymentElement,
  useStripe,
  useElements,
  Elements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useState, useEffect } from "react";
import { Button, Typography } from "tabler-react-2";
import { Alert } from "tabler-react-2/dist/alert";
import Confetti from "react-confetti";

export const PaymentElement = ({
  paymentIntentClientSecret,
  onFinish = () => {},
  onError = () => {},
  total,
  eventStripeConnectedAccountId,
}) => (
  <Elements
    stripe={loadStripe(import.meta.env.VITE_STRIPE_PK, {
      stripeAccount: eventStripeConnectedAccountId,
    })}
    options={{ clientSecret: paymentIntentClientSecret }}
  >
    <_PaymentElement
      paymentIntentClientSecret={paymentIntentClientSecret}
      onFinish={onFinish}
      onError={onError}
      total={total}
    />
  </Elements>
);

const _PaymentElement = ({
  paymentIntentClientSecret,
  onFinish = () => {},
  onError = () => {},
  total,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [amount, setAmount] = useState(null);

  // fetch PI on mount: status & amount
  useEffect(() => {
    if (!stripe) return;
    const fetchIntent = async () => {
      const { paymentIntent } = await stripe.retrievePaymentIntent(
        paymentIntentClientSecret
      );
      if (paymentIntent) {
        setAmount(paymentIntent.amount);
        if (paymentIntent.status === "succeeded") {
          setSuccess(true);
          onFinish(paymentIntent);
        }
      }
    };
    fetchIntent();
  }, [stripe, paymentIntentClientSecret, onFinish]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setLoading(false);
      onError(submitError);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret: paymentIntentClientSecret,
      redirect: "if_required",
    });

    setLoading(false);

    if (error) {
      onError(error);
    } else if (paymentIntent?.status === "succeeded") {
      setSuccess(true);
      onFinish(paymentIntent);
    } else {
      onError(new Error(`Unexpected status: ${paymentIntent?.status}`));
    }
  };

  if (success) {
    return (
      <div>
        <Alert variant="success" title="Success">
          Your payment has been successfully processed. You will receive an
          email with your receipt and details on your registration shortly.
        </Alert>
        <Button onClick={() => window.location.reload()}>
          Submit another response
        </Button>
      </div>
    );
  }

  const displayAmount =
    amount != null ? (amount / 100).toFixed(2) : parseFloat(total).toFixed(2);

  return (
    <form onSubmit={handleSubmit}>
      <StripePaymentElement />
      <Button
        type="submit"
        disabled={!stripe || loading}
        loading={loading}
        className="mt-3"
        variant="primary"
        style={{ width: "100%" }}
      >
        {`Pay $${displayAmount}`}
      </Button>
    </form>
  );
};
