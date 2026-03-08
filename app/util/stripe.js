import { loadStripe } from "@stripe/stripe-js";

const stripePromiseCache = new Map();

export const getStripePromise = (publishableKey, options = {}) => {
  if (!publishableKey) return null;

  const stripeAccount = options.stripeAccount || "";
  const cacheKey = `${publishableKey}:${stripeAccount}`;

  if (!stripePromiseCache.has(cacheKey)) {
    stripePromiseCache.set(
      cacheKey,
      loadStripe(
        publishableKey,
        stripeAccount ? { stripeAccount } : undefined
      )
    );
  }

  return stripePromiseCache.get(cacheKey);
};
