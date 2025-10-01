import { useMemo } from "react";
import useSWR from "swr";

import { dayOfAuthFetch, dayOfJson } from "../utils/apiClient";
import { useDayOfSessionContext } from "../contexts/DayOfSessionContext";

const fetchParticipantDetail = async ([url, token, instanceId]) => {
  const response = await dayOfAuthFetch(
    url,
    { token, instanceId },
    { method: "GET" }
  );
  return dayOfJson(response);
};

export const useParticipantDetail = (participantId) => {
  const { account, token } = useDayOfSessionContext();

  const key = useMemo(() => {
    if (!participantId || !account?.eventId || !token) return null;
    return [
      `/api/events/${account.eventId}/registration/${participantId}`,
      token,
      account.instanceId ?? null,
    ];
  }, [account?.eventId, account?.instanceId, participantId, token]);

  const { data, error, isLoading, mutate } = useSWR(
    key,
    fetchParticipantDetail,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    }
  );

  return {
    detail: data?.registration ?? null,
    fields: data?.fields ?? [],
    loading: Boolean(key) && isLoading,
    error,
    refetch: mutate,
  };
};
