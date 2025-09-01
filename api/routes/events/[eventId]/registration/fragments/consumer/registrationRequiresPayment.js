import { stripe } from "#stripe";

export const registrationRequiresPayment = async (
  upsells,
  selectedPeriodPricing,
  event,
  registrationId,
  instanceId,
  coupon // optional coupon object
) => {
  const upsellsTotal = upsells.reduce((sum, u) => sum + u.price, 0);
  const registrationTotal = selectedPeriodPricing.price;
  const totalBefore = upsellsTotal + registrationTotal;

  let discount = 0;
  if (coupon) {
    let eligible = 0;
    if (coupon.appliesTo === "BOTH") eligible = totalBefore;
    else if (coupon.appliesTo === "REGISTRATION") eligible = registrationTotal;
    else if (coupon.appliesTo === "UPSELLS") eligible = upsellsTotal;

    if (eligible > 0) {
      if (coupon.discountType === "FLAT") discount = coupon.amount;
      else if (coupon.discountType === "PERCENT")
        discount = (eligible * coupon.amount) / 100;

      if (discount > eligible) discount = eligible; // floor at zero
    }
  }

  let total = totalBefore - discount;
  if (total < 0) total = 0;

  // Treat totals under 30 cents as free
  const requiresPayment = total >= 0.3;

  if (requiresPayment) {
    const stripePIClientSecret = await setupStripePI(
      total,
      event,
      registrationId,
      instanceId
    );
    return [true, stripePIClientSecret, total];
  }

  return [false, null, total];
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
