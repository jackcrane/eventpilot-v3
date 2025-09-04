import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useDashCouponUsage = ({ eventId }) => {
  const key = eventId ? `/api/events/${eventId}/dash/coupons` : null;
  const { data, error, isLoading } = useSWR(key, fetcher);

  return {
    total: data?.total ?? 0,
    used: data?.used ?? 0,
    percent: data?.percent ?? null,
    previous: data?.previous || null,
    loading: isLoading,
    error,
    refetch: () => (key ? mutate(key) : undefined),
  };
};
