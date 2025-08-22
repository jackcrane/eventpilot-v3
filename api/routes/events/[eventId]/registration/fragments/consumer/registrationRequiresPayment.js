import { stripe } from "#stripe";

export const registrationRequiresPayment = async (
  upsells,
  selectedPeriodPricing,
  event,
  registrationId,
  instanceId
) => {
  let total = upsells.reduce((sum, u) => sum + u.price, 0);
  total += selectedPeriodPricing.price;

  const requiresPayment = total > 0;

  if (requiresPayment) {
    const stripePIClientSecret = await setupStripePI(
      total,
      event,
      registrationId,
      instanceId
    );
    return [true, stripePIClientSecret, total];
  }

  return [false, null, null];
};

export const setupStripePI = async (
  price,
  event,
  registrationId,
  instanceId
) => {
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
        registrationId,
        instanceId,
      },
    },
    {
      stripeAccount: event.stripeConnectedAccountId,
    }
  );

  return pi.client_secret;
};
