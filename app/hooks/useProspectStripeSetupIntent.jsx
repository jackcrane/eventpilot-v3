import useSWR from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

const createMockIntent = () => ({
  customerId: "cus_mock_prospect",
  intent: {
    id: "seti_mock_prospect",
    status: "succeeded",
    client_secret: "seti_mock_secret",
  },
  customer_session: {
    id: "cs_mock_prospect",
    client_secret: "cs_mock_secret",
  },
});

// Fetches a temporary Stripe customer + setup intent for billing during the
// new event wizard, before the event exists.
export const useProspectStripeSetupIntent = () => {
  const isMock = import.meta.env.VITE_STRIPE_MOCK === "true";

  if (isMock) {
    const mock = createMockIntent();
    return {
      customerId: mock.customerId,
      intent: mock.intent,
      customer_session: mock.customer_session,
      loading: false,
      error: null,
      refetch: async () => mock,
      mock: true,
    };
  }

  const key = "/api/events/prospect/payment/setup";
  const { data, error, isLoading, mutate: refetch } = useSWR(key, fetcher);

  return {
    customerId: data?.customerId,
    intent: data?.intent,
    customer_session: data?.customer_session,
    loading: isLoading,
    error,
    refetch,
    mock: false,
  };
};
