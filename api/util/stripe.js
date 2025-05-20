import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SK);

export const isCustomerInGoodStanding = async (customerId) => {
  // 1. Get customer with default payment method
  const customer = await stripe.customers.retrieve(customerId, {
    expand: ["invoice_settings.default_payment_method"],
  });
  console.log(customer);

  const hasDefaultPm = !!customer.invoice_settings?.default_payment_method;
  if (!hasDefaultPm) {
    console.log("No default payment method");
    return false;
  }

  // 2. Get latest invoice
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 1,
  });

  const latestInvoice = invoices.data[0];
  if (
    latestInvoice &&
    (latestInvoice.status === "unpaid" ||
      latestInvoice.status === "past_due" ||
      latestInvoice.status === "void")
  ) {
    console.log("Latest Invoice");
    return false;
  }

  // 3. Check active subscriptions
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  const goodStatuses = ["active", "trialing"];
  const badStatuses = ["unpaid", "incomplete_expired"];

  // check at least one good subscription
  const hasGoodSub = subs.data.some((sub) => goodStatuses.includes(sub.status));

  // check if any current subscriptions are failing
  const hasFailingSub = subs.data.some((sub) =>
    badStatuses.includes(sub.status)
  );

  if (!hasGoodSub || hasFailingSub) {
    console.log("Sub");
    return false;
  }

  return true;
};
