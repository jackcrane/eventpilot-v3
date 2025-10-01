import { useMemo } from "react";
import useSWRMutation from "swr/mutation";

import { dayOfAuthFetch, dayOfJson } from "../utils/apiClient";
import { useDayOfSessionContext } from "../contexts/DayOfSessionContext";

const updateParticipantCheckIn = async ([url, token, instanceId], { arg }) => {
  const checkedIn =
    typeof arg === "boolean"
      ? arg
      : typeof arg?.checkedIn === "boolean"
      ? arg.checkedIn
      : null;

  if (checkedIn === null) {
    throw new Error("checkedIn boolean is required");
  }

  const response = await dayOfAuthFetch(
    url,
    { token, instanceId },
    {
      method: "PATCH",
      body: JSON.stringify({ checkedIn }),
    }
  );

  return dayOfJson(response);
};

export const useParticipantCheckIn = (participantId) => {
  const { account, token } = useDayOfSessionContext();

  const key = useMemo(() => {
    if (!participantId || !account?.eventId || !token) return null;
    return [
      `/api/events/${account.eventId}/registration/${participantId}/checkin`,
      token,
      account.instanceId ?? null,
    ];
  }, [account?.eventId, account?.instanceId, participantId, token]);

  const mutation = useSWRMutation(key, updateParticipantCheckIn, {
    revalidate: false,
  });

  return {
    updateCheckIn: async (checkedIn) =>
      mutation.trigger(checkedIn, { throwOnError: true }),
    updating: mutation.isMutating,
    updateError: mutation.error,
  };
};
