import { stripe } from "#stripe";

// Returns status of a Stripe connected account for an event.
// Input: `stripeConnectedAccountId` (string | null | undefined)
// Output: {
//   hasAccount: boolean,
//   onboarded: boolean,         // mirrors Stripe's `details_submitted`
//   payoutsEnabled: boolean,    // mirrors Stripe's `payouts_enabled`
//   account: object | null      // Stripe Account object when available
// }
export const getStripeAccountStatus = async (stripeConnectedAccountId) => {
  if (!stripeConnectedAccountId) {
    return {
      hasAccount: false,
      onboarded: false,
      payoutsEnabled: false,
      account: null,
    };
  }

  try {
    const account = await stripe.accounts.retrieve(stripeConnectedAccountId);
    const onboarded = !!account?.details_submitted;
    const payoutsEnabled = !!account?.payouts_enabled;

    return {
      hasAccount: true,
      onboarded,
      payoutsEnabled,
      account,
    };
  } catch (e) {
    console.error("Error retrieving Stripe account:", e);
    return {
      hasAccount: true,
      onboarded: false,
      payoutsEnabled: false,
      account: null,
    };
  }
};
