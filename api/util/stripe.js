import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SK);

// Account-level standing: treat as "has at least one attached card" or a default PM
// This is used for onboarding nudges; event-level enforcement lives on Event.goodPaymentStanding
export const isCustomerInGoodStanding = async (customerId) => {
  if (!customerId) return false;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    const defaultPm = customer?.invoice_settings?.default_payment_method;
    if (defaultPm) return true;
    const pms = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
      limit: 1,
    });
    return (pms?.data?.length || 0) > 0;
  } catch (e) {
    return false;
  }
};
