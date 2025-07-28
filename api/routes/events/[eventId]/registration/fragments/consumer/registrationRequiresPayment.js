import { stripe } from "#stripe";

export const registrationRequiresPayment = async (
  upsells,
  selectedPeriodPricing,
  event
) => {
  let total = upsells.reduce((sum, u) => sum + u.price, 0);
  total += selectedPeriodPricing.price;

  const requiresPayment = total > 0;

  if (requiresPayment) {
    const stripePIClientSecret = await setupStripePI(total, event);
    return [true, stripePIClientSecret, total];
  }

  return [false, null, null];
};

export const setupStripePI = async (price, event) => {
  const pi = await stripe.paymentIntents.create(
    {
      amount: price * 100,
      currency: "usd",
      // payment_method_types: ["card"],
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        eventId: event.id,
        scope: "EVENTPILOT:REGISTRATION",
      },
    },
    {
      stripeAccount: event.stripeConnectedAccountId,
    }
  );

  return pi.client_secret;
};
