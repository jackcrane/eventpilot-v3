import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useDashVolunteers = ({ eventId }) => {
  const key = `/api/events/${eventId}/dash/volunteers`;
  const { data, error, isLoading } = useSWR(key, fetcher);

  return {
    volunteerRegistrations: data?.volunteerRegistrations,
    registrationsByDay: data?.registrationsByDay,
    previous: data?.previous || null,
    loading: isLoading,
    error,
    refetch: () => mutate(key),
  };
};
