import useSWR, { useSWRConfig } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useDashVolunteerCapacity = ({ eventId }) => {
  const key = eventId ? `/api/events/${eventId}/dash/volunteer-capacity` : null;
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR(key, fetcher);

  return {
    jobs: data?.jobs || null,
    shifts: data?.shifts || null,
    note: data?.note || null,
    previous: data?.previous || null,
    loading: isLoading,
    error,
    refetch: () => (key ? mutate(key) : undefined),
  };
};
