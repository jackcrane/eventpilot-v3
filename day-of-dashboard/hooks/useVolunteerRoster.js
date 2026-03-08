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
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry)).filter(Boolean).join(', ');
  }
  if (typeof value?.label === 'string') return value.label;
  if (typeof value === 'object') {
    return Object.values(value)
      .map((entry) => normalizeValue(entry))
      .filter(Boolean)
      .join(', ');
  }
  return '';
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
      `/api/events/${account.eventId}/volunteers`,
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
  const rows = data?.rows ?? data?.responses ?? [];

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
    if (!rows.length) return [];

    return rows.map((row) => {
      const values = row?.fields ?? row ?? {};
      const displayValues = row?.fieldDisplay ?? {};

      const name =
        row?.flat?.name
        || (nameFieldId ? displayValues[nameFieldId] : '')
        || (nameFieldId ? normalizeValue(values[nameFieldId]) : '');
      const email =
        row?.flat?.email
        || (emailFieldId ? displayValues[emailFieldId] : '')
        || (emailFieldId ? normalizeValue(values[emailFieldId]) : '');
      const phone =
        phoneFieldId
          ? displayValues[phoneFieldId] || normalizeValue(values[phoneFieldId])
          : '';

      const tokens = [
        row?.id,
        name,
        email,
        phone,
        row?.instanceName,
        ...(Array.isArray(row?.jobs) ? row.jobs : []),
        ...(Array.isArray(row?.locations) ? row.locations : []),
      ];

      for (const value of Object.values(displayValues)) {
        tokens.push(normalizeValue(value));
      }

      for (const value of Object.values(values)) {
        tokens.push(normalizeValue(value));
      }

      return {
        id: row?.id,
        createdAt: row?.createdAt,
        updatedAt: row?.updatedAt,
        name,
        email,
        phone,
        values,
        searchText: tokens
          .filter((token) => token && token.length)
          .join(' \n')
          .toLowerCase(),
      };
    });
  }, [emailFieldId, nameFieldId, phoneFieldId, rows]);

  return {
    fields,
    volunteers,
    loading: isLoading,
    error,
    refetch: mutate,
  };
};
