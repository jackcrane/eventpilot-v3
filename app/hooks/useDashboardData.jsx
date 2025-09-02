import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useDashboardData = (eventId) => {
  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(`/api/events/${eventId}/dash`, fetcher);

  return {
    progress: data?.progress,
    shiftCount: data?.shiftCount,
    locationCount: data?.locationCount,
    jobCount: data?.jobCount,
    volunteerRegistrationCount: data?.volunteerRegistrationCount,
    volunteerRegistrationByDay: data?.volunteerRegistrationByDay,
    eventStart: data?.eventStart,
    gmailConnected: data?.progress?.steps?.gmail,
    volunteerRegistrationEnabled: data?.volunteerRegistrationEnabled,
    registrationEnabled: data?.registrationEnabled,
    loading: isLoading,
    error,
    refetch,
  };
};
