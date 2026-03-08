import { useEffect, useMemo, useState } from 'react';
import useSWRInfinite from 'swr/infinite';

import { dayOfAuthFetch, dayOfJson } from '../utils/apiClient';
import { useDayOfSessionContext } from '../contexts/DayOfSessionContext';

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

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

const buildRosterPath = ({ eventId, page, search }) => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('size', String(PAGE_SIZE));
  if (search) params.set('q', search);
  return `/api/events/${eventId}/volunteers?${params.toString()}`;
};

export const useVolunteerRoster = ({ search = '' } = {}) => {
  const { account, token } = useDayOfSessionContext();
  const normalizedSearch = useMemo(() => search.trim(), [search]);
  const [debouncedSearch, setDebouncedSearch] = useState(normalizedSearch);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(normalizedSearch);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [normalizedSearch]);

  const {
    data,
    isLoading,
    error,
    mutate,
    isValidating,
    size,
    setSize,
  } = useSWRInfinite(
    (pageIndex, previousPageData) => {
      if (!account?.eventId || !token) return null;
      if (previousPageData) {
        const previousRows =
          previousPageData?.rows ?? previousPageData?.responses ?? [];
        const previousTotal = previousPageData?.meta?.total ?? 0;
        const loadedCount = pageIndex * PAGE_SIZE;

        if (!previousRows.length || loadedCount >= previousTotal) {
          return null;
        }
      }

      return [
        buildRosterPath({
          eventId: account.eventId,
          page: pageIndex + 1,
          search: debouncedSearch,
        }),
        token,
        account.instanceId ?? null,
      ];
    },
    fetchVolunteerRoster,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      revalidateFirstPage: false,
    }
  );

  useEffect(() => {
    void setSize(1);
  }, [debouncedSearch, setSize]);

  const pages = data ?? [];
  const firstPage = pages[0] ?? null;
  const fields = firstPage?.fields ?? [];
  const rows = useMemo(
    () =>
      pages.flatMap((page) => {
        if (!page) return [];
        return page?.rows ?? page?.responses ?? [];
      }),
    [pages]
  );
  const total = firstPage?.meta?.total ?? 0;

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

  const loadingMore = Boolean(pages.length) && isValidating && size > pages.length;
  const hasMore = volunteers.length < total;

  return {
    fields,
    volunteers,
    loading: isLoading,
    loadingMore,
    hasMore,
    error,
    refetch: mutate,
    loadMore: () => {
      if (loadingMore || !hasMore) return Promise.resolve();
      return setSize(size + 1);
    },
  };
};
