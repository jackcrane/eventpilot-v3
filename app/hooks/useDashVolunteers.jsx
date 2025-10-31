import useSWR, { useSWRConfig } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useDashVolunteers = ({ eventId }) => {
  const key = `/api/events/${eventId}/dash/volunteers`;
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR(key, fetcher);

  return {
    volunteerRegistrations: data?.volunteerRegistrations,
    registrationsByDay: data?.registrationsByDay,
    trend: data?.trend || null,
    previous: data?.previous || null,
    loading: isLoading,
    error,
    refetch: () => mutate(key),
  };
};
