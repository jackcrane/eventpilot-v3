import { useMemo } from 'react';
import useSWR from 'swr';

import { dayOfAuthFetch, dayOfJson } from '../utils/apiClient';
import { useDayOfSessionContext } from '../contexts/DayOfSessionContext';

const fetchVolunteerRoster = async ([url, token, instanceId]) => {
  const response = await dayOfAuthFetch(
    url,
    { token, instanceId },
    { method: 'GET' }
  );
  return dayOfJson(response);
};

const normalizeValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value?.label === 'string') return value.label;
  return JSON.stringify(value);
};

const resolveFieldId = (fields, predicate) => {
  const match = fields.find(predicate);
  return match ? match.id : null;
};

export const useVolunteerRoster = () => {
  const { account, token } = useDayOfSessionContext();

  const key = useMemo(() => {
    if (!account?.eventId || !token) return null;
    return [
      `/api/events/${account.eventId}/submission`,
      token,
      account.instanceId ?? null,
    ];
  }, [account?.eventId, account?.instanceId, token]);

  const {
    data,
    isLoading,
    error,
    mutate,
  } = useSWR(key, fetchVolunteerRoster, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });

  const fields = data?.fields ?? [];
  const responses = data?.responses ?? [];

  const nameFieldId = useMemo(
    () =>
      resolveFieldId(
        fields,
        (field) =>
          field.eventpilotFieldType === 'volunteerName' ||
          /name/i.test(field.label ?? '')
      ),
    [fields]
  );

  const emailFieldId = useMemo(
    () =>
      resolveFieldId(
        fields,
        (field) =>
          field.eventpilotFieldType === 'volunteerEmail' ||
          /email/i.test(field.label ?? '')
      ),
    [fields]
  );

  const phoneFieldId = useMemo(
    () =>
      resolveFieldId(
        fields,
        (field) =>
          field.eventpilotFieldType === 'volunteerPhone' ||
          /phone|mobile|cell/i.test(field.label ?? '')
      ),
    [fields]
  );

  const volunteers = useMemo(() => {
    if (!responses.length) return [];

    return responses.map((resp) => {
      const name = nameFieldId ? normalizeValue(resp[nameFieldId]) : '';
      const email = emailFieldId ? normalizeValue(resp[emailFieldId]) : '';
      const phone = phoneFieldId ? normalizeValue(resp[phoneFieldId]) : '';

      const tokens = [resp.id, name, email, phone];
      for (const value of Object.values(resp)) {
        if (value && typeof value === 'object' && !('label' in value)) {
          continue;
        }
        tokens.push(normalizeValue(value));
      }

      return {
        id: resp.id,
        createdAt: resp.createdAt,
        updatedAt: resp.updatedAt,
        name,
        email,
        phone,
        values: resp,
        searchText: tokens
          .filter((token) => token && token.length)
          .join(' \n')
          .toLowerCase(),
      };
    });
  }, [emailFieldId, nameFieldId, phoneFieldId, responses]);

  return {
    fields,
    volunteers,
    loading: isLoading,
    error,
    refetch: mutate,
  };
};
