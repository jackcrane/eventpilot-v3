import useSWR, { mutate } from "swr";
import toast from "react-hot-toast";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useEventBilling = ({ eventId }) => {
  const key = eventId ? `/api/events/${eventId}/billing` : null;
  const { data, error, isLoading, mutate: refetch } = useSWR(key, fetcher);

  const setDefaultPaymentMethod = async (paymentMethodId) => {
    if (!key) return false;
    return await toast.promise(
      authFetch(key, {
        method: "PATCH",
        body: JSON.stringify({ defaultPaymentMethodId: paymentMethodId }),
      }).then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        await mutate(key);
        return true;
      }),
      {
        loading: "Updating default method…",
        success: "Default payment method updated",
        error: "Failed to update default",
      }
    );
  };

  const updateBillingEmail = async (billingEmail) => {
    if (!key) return false;
    return await toast.promise(
      authFetch(key, {
        method: "PATCH",
        body: JSON.stringify({ billingEmail }),
      }).then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        await mutate(key);
        return true;
      }),
      {
        loading: "Updating billing email…",
        success: "Billing email updated",
        error: "Failed to update billing email",
      }
    );
  };

  const removePaymentMethod = async (paymentMethodId) => {
    // Removal is customer-scoped; reuse existing endpoint
    return await toast.promise(
      authFetch(`/api/auth/me/payment/methods/${paymentMethodId}`, {
        method: "DELETE",
      }).then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        await mutate(key);
        return true;
      }),
      {
        loading: "Removing payment method…",
        success: "Payment method removed",
        error: "Failed to remove method",
      }
    );
  };

  return {
    billing: data?.billing,
    paymentMethods: data?.billing?.paymentMethods || [],
    defaultPaymentMethodId: data?.billing?.defaultPaymentMethodId || null,
    invoices: data?.billing?.invoices || [],
    billingEmail: data?.billing?.billingEmail || null,
    goodPaymentStanding: Boolean(data?.billing?.goodPaymentStanding),
    loading: isLoading,
    error,
    refetch,
    setDefaultPaymentMethod,
    removePaymentMethod,
    updateBillingEmail,
  };
};
