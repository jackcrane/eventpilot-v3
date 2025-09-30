import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_STORAGE_KEY = 'day-of-dashboard/session';

export type StoredDayOfSession = {
  token: string;
  accountId: string;
  eventId: string;
  provisionerId: string;
  instanceId: string | null;
  permissions: string[];
  name: string | null;
  expiresAt: string;
};

export const loadStoredSession = async () => {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredDayOfSession;
  } catch (error) {
    console.warn('Failed to read session from storage', error);
    return null;
  }
};

export const persistSession = async (session: StoredDayOfSession) => {
  try {
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn('Failed to persist session', error);
  }
};

export const clearSession = async () => {
  try {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear session', error);
  }
};

export const updateStoredSession = async (
  updater: (session: StoredDayOfSession | null) => StoredDayOfSession | null
) => {
  const current = await loadStoredSession();
  const next = updater(current);
  if (!next) {
    await clearSession();
    return null;
  }
  await persistSession(next);
  return next;
};

export const getSessionStorageKey = () => SESSION_STORAGE_KEY;

