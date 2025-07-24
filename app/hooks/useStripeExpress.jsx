import { authFetch } from "../util/url";
import useSWR from "swr";
import toast from "react-hot-toast";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export function useStripeExpress({ eventId }) {
  const sessionUrl = eventId
    ? `/api/events/${eventId}/stripe/account-session`
    : null;
  const { data, error, isLoading } = useSWR(sessionUrl, fetcher);

  const startOnboarding = async () => {
    if (!sessionUrl) return;
    const promise = fetcher(sessionUrl);
    const { url } = await toast.promise(promise, {
      loading: "Starting Stripe onboarding…",
      success: "Redirecting to Stripe",
      error: "Failed to start onboarding",
    });
    window.location.href = url; // ← send them to Stripe’s hosted form
  };

  return {
    startOnboarding,
    isLoading,
    error,
    account: data?.account,
    isNew: data?.isNew,
    loginUrl: data?.loginUrl,
  };
}
