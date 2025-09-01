import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import { useState } from "react";
import toast from "react-hot-toast";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useRegistrationConsumer = ({ eventId }) => {
  const key = `/api/events/${eventId}/registration/consumer`;
  const { data, error, isLoading } = useSWR(key, fetcher);
  const [mutationLoading, setMutationLoading] = useState(false);

  const [requiresPayment, setRequiresPayment] = useState(false);
  const [stripePIClientSecret, setStripePIClientSecret] = useState(null);
  const [finalized, setFinalized] = useState(false);
  const [price, setPrice] = useState(null);
  const [registrationId, setRegistrationId] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);

  const submit = async (data) => {
    setMutationLoading(true);
    const promise = authFetch(key, {
      method: "POST",
      body: JSON.stringify(data),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        const data = await r.json();
        const { requiresPayment, price, stripePIClientSecret, registration } =
          data.registration;
        setRequiresPayment(requiresPayment);
        setStripePIClientSecret(stripePIClientSecret);
        setPrice(price);
        setFinalized(data.registration.finalized);
        // Capture registration id for later coupon application
        const rid = registration?.id || data.registration?.registration?.id;
        if (rid) setRegistrationId(rid);
        setMutationLoading(false);
        return true;
      })
      .finally(() => setMutationLoading(false));

    await toast.promise(promise, {
      loading: "Submitting...",
      success: "Submitted successfully",
      error: "Error",
    });

    await mutate(key);
    return true;
  };

  const applyCoupon = async (couponCode) => {
    if (!registrationId) return false;
    setApplyLoading(true);
    const url = `/api/events/${eventId}/registration/consumer/coupon`;
    const promise = authFetch(url, {
      method: "POST",
      body: JSON.stringify({ registrationId, couponCode }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j?.message || "Failed to apply coupon");
        setRequiresPayment(Boolean(j.requiresPayment));
        setStripePIClientSecret(j.stripePIClientSecret || null);
        setPrice(j.price ?? null);
        setFinalized(Boolean(j.finalized));
        return true;
      })
      .finally(() => setApplyLoading(false));

    await toast.promise(promise, {
      loading: "Applying coupon...",
      success: "Coupon applied",
      error: (e) => e?.message || "Failed to apply coupon",
    });

    return true;
  };

  return {
    tiers: data?.tiers,
    loading: isLoading,
    mutationLoading,
    requiresPayment,
    stripePIClientSecret,
    finalized,
    applyLoading,
    submit,
    applyCoupon,
    error,
    refetch: () => mutate(key),
    price,
    registrationId,
  };
};
