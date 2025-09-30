import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import {
  DayOfApiError,
  dayOfAuthFetch,
  dayOfJson,
  dayOfPublicFetch,
} from '@/utils/apiClient';
import {
  StoredDayOfSession,
  clearSession as clearStoredSession,
  loadStoredSession,
  persistSession,
} from '@/utils/storage';

export type DayOfDashboardPermission = string;

export type DayOfDashboardAccount = {
  id: string;
  eventId: string;
  provisionerId: string;
  instanceId: string | null;
  name: string | null;
  permissions: DayOfDashboardPermission[];
  tokenVersion: number;
  lastIssuedAt: string | null;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LoginSuccessPayload = {
  token: string;
  expiresAt: string;
  account: DayOfDashboardAccount;
  provisioner: {
    id: string;
    eventId: string;
    instanceId: string | null;
    permissions: DayOfDashboardPermission[];
    jwtExpiresInSeconds: number;
    tokenVersion: number;
  };
};

export type DayOfSessionState = {
  hydrated: boolean;
  loading: boolean;
  account: DayOfDashboardAccount | null;
  token: string | null;
  permissions: DayOfDashboardPermission[];
  login: (input: { pin: string; name?: string | null }) => Promise<LoginSuccessPayload>;
  logout: () => Promise<void>;
  requireName: boolean;
  setAccountName: (name: string) => Promise<void>;
  updatingName: boolean;
  loginError: string | null;
  loggingIn: boolean;
};

type AccountFetcherKey = [string, string, string | null];

type AccountResponse = {
  account: DayOfDashboardAccount;
};

const fetchAccount = async ([url, token, instanceId]: AccountFetcherKey) => {
  const response = await dayOfAuthFetch(url, { token, instanceId }, { method: 'GET' });
  return dayOfJson<AccountResponse>(response);
};

const useStoredSession = () => {
  const [session, setSession] = useState<StoredDayOfSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadStoredSession()
      .then((value) => {
        if (!cancelled) {
          setSession(value);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHydrated(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveSession = useCallback(async (value: StoredDayOfSession | null) => {
    if (!value) {
      await clearStoredSession();
      setSession(null);
      return;
    }
    await persistSession(value);
    setSession(value);
  }, []);

  return { session, hydrated, saveSession } as const;
};

export const useDayOfSession = (): DayOfSessionState => {
  const { session, hydrated, saveSession } = useStoredSession();
  const [loginError, setLoginError] = useState<string | null>(null);

  const accountKey = useMemo(() => {
    if (!session?.token) return null;
    if (!session.accountId || !session.eventId) return null;
    const path = `/api/events/${session.eventId}/day-of-dashboard/accounts/${session.accountId}`;
    return [path, session.token, session.instanceId ?? null] as AccountFetcherKey;
  }, [session]);

  const {
    data: accountData,
    isLoading: accountLoading,
    error: accountError,
    mutate: mutateAccount,
  } = useSWR(accountKey, fetchAccount, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: session?.token ? 30_000 : 0,
    refreshWhenHidden: false,
  });

  const loginMutation = useSWRMutation(
    '/api/day-of-dashboard/login',
    async (
      url: string,
      { arg }: { arg: { pin: string; name?: string | null } }
    ) => {
      const payload = {
        pin: `${arg.pin}`.trim(),
        ...(arg.name ? { name: `${arg.name}`.trim() } : {}),
      };
      const response = await dayOfPublicFetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await dayOfJson<LoginSuccessPayload>(response);
      return data;
    },
    { revalidate: false }
  );

  const updateNameMutation = useSWRMutation(
    () =>
      session
        ? `/api/events/${session.eventId}/day-of-dashboard/accounts/${session.accountId}`
        : null,
    async (url: string, { arg }: { arg: { name: string } }) => {
      if (!session) {
        throw new Error('No active session');
      }
      const response = await dayOfAuthFetch(
        url,
        { token: session.token, instanceId: session.instanceId },
        {
          method: 'PUT',
          body: JSON.stringify({ name: arg.name.trim() }),
        }
      );
      const data = await dayOfJson<AccountResponse>(response);
      return data;
    },
    { revalidate: false }
  );

  const login = useCallback<DayOfSessionState['login']>(
    async ({ pin, name }) => {
      setLoginError(null);
      const trimmedPin = `${pin}`.trim();
      if (!trimmedPin) {
        throw new Error('PIN is required');
      }
      try {
        const data = await loginMutation.trigger({ pin: trimmedPin, name: name ?? undefined });
        const storedSession: StoredDayOfSession = {
          token: data.token,
          accountId: data.account.id,
          eventId: data.account.eventId,
          provisionerId: data.account.provisionerId,
          instanceId: data.account.instanceId ?? null,
          permissions: data.account.permissions || [],
          name: data.account.name ?? null,
          expiresAt: data.expiresAt,
        };
        await saveSession(storedSession);
        await mutateAccount(
          () => ({ account: data.account }),
          { revalidate: false }
        );
        return data;
      } catch (error) {
        if (error instanceof DayOfApiError) {
          setLoginError(error.message);
        } else {
          setLoginError('Unable to log in. Please try again.');
        }
        throw error;
      }
    },
    [loginMutation, mutateAccount, saveSession]
  );

  const logout = useCallback(async () => {
    await saveSession(null);
    await mutateAccount(undefined, { revalidate: false });
  }, [mutateAccount, saveSession]);

  useEffect(() => {
    if (!accountError) return;
    if (
      accountError instanceof DayOfApiError &&
      (accountError.status === 401 || accountError.status === 403)
    ) {
      logout();
    }
  }, [accountError, logout]);

  const setAccountName = useCallback(
    async (name: string) => {
      if (!session) return;
      const trimmed = name.trim();
      if (!trimmed.length) {
        throw new Error('Name must be at least one character');
      }

      try {
        const result = await updateNameMutation.trigger({ name: trimmed });
        const updatedSession: StoredDayOfSession = {
          ...session,
          name: result.account.name ?? trimmed,
          permissions: result.account.permissions || session.permissions,
        };
        await saveSession(updatedSession);
        await mutateAccount(
          () => ({ account: result.account }),
          { revalidate: false }
        );
      } catch (error) {
        if (error instanceof DayOfApiError && error.status === 403) {
          const updatedSession: StoredDayOfSession = {
            ...session,
            name: trimmed,
          };
          await saveSession(updatedSession);
          await mutateAccount(
            (current) =>
              current
                ? { account: { ...current.account, name: trimmed } }
                : current,
            { revalidate: false }
          );
          return;
        }
        throw error;
      }
    },
    [mutateAccount, saveSession, session, updateNameMutation]
  );

  const token = session?.token ?? null;
  const account = accountData?.account ?? null;
  const permissions = useMemo(
    () => account?.permissions ?? session?.permissions ?? [],
    [account?.permissions, session?.permissions]
  );

  const loading = Boolean(token) && (accountLoading || (!accountData && !accountError));

  const requireName = useMemo(() => {
    if (!token) return false;
    if (!hydrated) return false;
    const currentName = account?.name ?? session?.name ?? null;
    return !currentName;
  }, [account?.name, hydrated, session?.name, token]);

  return {
    hydrated,
    loading,
    account: account ?? (session
      ? {
          id: session.accountId,
          eventId: session.eventId,
          provisionerId: session.provisionerId,
          instanceId: session.instanceId,
          name: session.name,
          permissions: session.permissions,
          tokenVersion: 0,
          lastIssuedAt: null,
          deleted: false,
          createdAt: '',
          updatedAt: '',
        }
      : null),
    token,
    permissions,
    login,
    logout,
    requireName,
    setAccountName,
    updatingName: updateNameMutation.isMutating,
    loginError,
    loggingIn: loginMutation.isMutating,
  };
};
