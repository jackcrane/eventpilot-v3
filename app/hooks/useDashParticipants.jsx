import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useDashParticipants = ({ eventId }) => {
  const key = eventId ? `/api/events/${eventId}/dash/participants` : null;
  const { data, error, isLoading } = useSWR(key, fetcher);

  return {
    participantRegistrations: data?.participantRegistrations,
    registrationsByDay: data?.registrationsByDay,
    previous: data?.previous || null,
    loading: isLoading,
    error,
    refetch: () => (key ? mutate(key) : undefined),
  };
};
