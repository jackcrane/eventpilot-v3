import { stripe } from "#stripe";

export const registrationRequiresPayment = async (
  upsells,
  selectedPeriodPricing
) => {
  let total = upsells.reduce((sum, u) => sum + u.price, 0);
  total += selectedPeriodPricing.price;

  const requiresPayment = total > 0;

  if (requiresPayment) {
    const stripePIClientSecret = await setupStripePI(total);
    return [true, stripePIClientSecret, total];
  }

  return [false, null, null];
};

export const setupStripePI = async (price) => {
  const pi = await stripe.paymentIntents.create({
    amount: price * 100,
    currency: "usd",
    // payment_method_types: ["card"],
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return pi.client_secret;
};
