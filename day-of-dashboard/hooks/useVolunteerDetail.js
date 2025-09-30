import useSWR from 'swr';
import { useMemo } from 'react';

import { dayOfAuthFetch, dayOfJson } from '../utils/apiClient';
import { useDayOfSessionContext } from '../contexts/DayOfSessionContext';

const fetchVolunteerDetail = async ([url, token, instanceId]) => {
  const response = await dayOfAuthFetch(
    url,
    { token, instanceId },
    { method: 'GET' }
  );
  return dayOfJson(response);
};

export const useVolunteerDetail = (volunteerId) => {
  const { account, token } = useDayOfSessionContext();

  const key = useMemo(() => {
    if (!volunteerId || !account?.eventId || !token) return null;
    return [
      `/api/events/${account.eventId}/submission/${volunteerId}`,
      token,
      account.instanceId ?? null,
    ];
  }, [account?.eventId, account?.instanceId, token, volunteerId]);

  const { data, error, isLoading, mutate } = useSWR(
    key,
    fetchVolunteerDetail,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    }
  );

  return {
    detail: data ?? null,
    loading: Boolean(key) && isLoading,
    error,
    refetch: mutate,
  };
};
