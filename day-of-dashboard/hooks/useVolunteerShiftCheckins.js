import { useMemo } from "react";
import useSWRMutation from "swr/mutation";

import { dayOfAuthFetch, dayOfJson } from "../utils/apiClient";
import { useDayOfSessionContext } from "../contexts/DayOfSessionContext";

const updateCheckInsFetcher = async ([url, token, instanceId], { arg }) => {
  const payload = Array.isArray(arg) ? arg : arg?.checkIns;
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("At least one shift must be provided");
  }

  const response = await dayOfAuthFetch(
    url,
    { token, instanceId },
    {
      method: "PATCH",
      body: JSON.stringify({ checkIns: payload }),
    }
  );

  return dayOfJson(response);
};

export const useVolunteerShiftCheckins = (volunteerId) => {
  const { account, token } = useDayOfSessionContext();

  const key = useMemo(() => {
    if (!volunteerId || !account?.eventId || !token) return null;
    return [
      `/api/events/${account.eventId}/submission/${volunteerId}/checkins`,
      token,
      account.instanceId ?? null,
    ];
  }, [account?.eventId, account?.instanceId, token, volunteerId]);

  const mutation = useSWRMutation(key, updateCheckInsFetcher, {
    revalidate: false,
  });

  return {
    updateCheckIns: async (checkIns) =>
      mutation.trigger(checkIns, { throwOnError: true }),
    updating: mutation.isMutating,
    updateError: mutation.error,
  };
};
