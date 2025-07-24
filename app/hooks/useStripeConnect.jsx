import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import toast from "react-hot-toast";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useStripeConnect = ({ eventId }) => {
  const [stripeConnectInstance, setStripeConnectInstance] = useState();

  const sessionUrl = eventId
    ? `/api/events/${eventId}/stripe/account-session`
    : null;

  const { data, error, isLoading } = useSWR(sessionUrl, fetcher);

  const createStripeSession = async () => {
    const promise = mutate(sessionUrl);
    await toast.promise(promise, {
      loading: "Creating session…",
      success: "Session created",
      error: "Error creating session",
    });
    return data?.client_secret;
  };

  useEffect(() => {
    if (!eventId || !data?.client_secret) return;

    const instance = loadConnectAndInitialize({
      publishableKey: import.meta.env.VITE_STRIPE_PK,
      fetchClientSecret: () => Promise.resolve(data.client_secret),
      appearance: {
        overlays: "dialog",
        variables: { colorPrimary: "#635BFF" },
      },
    });

    setStripeConnectInstance(instance);
  }, [eventId, data?.client_secret]);

  return {
    stripeConnectInstance,
    createStripeSession,
    isLoading,
    account: data?.account,
    error,
  };
};
