import { stripe } from "#stripe";

const getPaymentEligibilityReason = ({
  onboarded,
  chargesEnabled,
  payoutsEnabled,
  account,
}) => {
  if (!onboarded) {
    return "Stripe onboarding has not been completed yet.";
  }

  const pendingVerificationCount =
    account?.requirements?.pending_verification?.length || 0;
  if (pendingVerificationCount > 0) {
    return "Stripe is still reviewing the connected account.";
  }

  const dueRequirementsCount =
    (account?.requirements?.currently_due?.length || 0) +
    (account?.requirements?.past_due?.length || 0);
  if (dueRequirementsCount > 0) {
    return "Stripe needs more information before this event can accept payments.";
  }

  if (!chargesEnabled && !payoutsEnabled) {
    return "Stripe has not enabled charges or payouts for this account yet.";
  }

  if (!chargesEnabled) {
    return "Stripe has not enabled charges for this account yet.";
  }

  if (!payoutsEnabled) {
    return "Stripe has not enabled payouts for this account yet.";
  }

  return "The connected Stripe account is not currently eligible to accept payments.";
};

export const buildStripeAccountStatus = (account) => {
  if (!account) {
    return {
      hasAccount: false,
      onboarded: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      acceptsPayments: false,
      paymentEligibilityReason:
        "No Stripe Connect account has been set up for this event yet.",
      account: null,
    };
  }

  const onboarded = !!account?.details_submitted;
  const chargesEnabled = !!account?.charges_enabled;
  const payoutsEnabled = !!account?.payouts_enabled;
  const acceptsPayments = chargesEnabled && payoutsEnabled;

  return {
    hasAccount: true,
    onboarded,
    chargesEnabled,
    payoutsEnabled,
    acceptsPayments,
    paymentEligibilityReason: acceptsPayments
      ? null
      : getPaymentEligibilityReason({
          onboarded,
          chargesEnabled,
          payoutsEnabled,
          account,
        }),
    account,
  };
};

// Returns status of a Stripe connected account for an event.
// Input: `stripeConnectedAccountId` (string | null | undefined)
// Output: {
//   hasAccount: boolean,
//   onboarded: boolean,         // mirrors Stripe's `details_submitted`
//   chargesEnabled: boolean,    // mirrors Stripe's `charges_enabled`
//   payoutsEnabled: boolean,    // mirrors Stripe's `payouts_enabled`
//   acceptsPayments: boolean,   // requires both charges + payouts to be enabled
//   paymentEligibilityReason: string | null,
//   account: object | null      // Stripe Account object when available
// }
export const getStripeAccountStatus = async (stripeConnectedAccountId) => {
  if (!stripeConnectedAccountId) {
    return buildStripeAccountStatus(null);
  }

  try {
    const account = await stripe.accounts.retrieve(stripeConnectedAccountId);
    return buildStripeAccountStatus(account);
  } catch (e) {
    console.error("Error retrieving Stripe account:", e);
    return {
      hasAccount: true,
      onboarded: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      acceptsPayments: false,
      paymentEligibilityReason:
        "Stripe account status could not be verified right now.",
      account: null,
    };
  }
};
