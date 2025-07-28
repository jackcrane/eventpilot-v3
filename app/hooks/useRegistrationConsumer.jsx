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

  const submit = async (data) => {
    setMutationLoading(true);
    const promise = authFetch(key, {
      method: "POST",
      body: JSON.stringify(data),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        const data = await r.json();
        const { requiresPayment, price, stripePIClientSecret } =
          data.registration;
        setRequiresPayment(requiresPayment);
        setStripePIClientSecret(stripePIClientSecret);
        setPrice(price);
        setFinalized(data.registration.finalized);
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

  return {
    tiers: data?.tiers,
    loading: isLoading,
    mutationLoading,
    requiresPayment,
    stripePIClientSecret,
    finalized,
    submit,
    error,
    refetch: () => mutate(key),
  };
};
