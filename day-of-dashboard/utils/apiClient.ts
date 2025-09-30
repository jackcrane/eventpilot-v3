import Constants from 'expo-constants';

export class DayOfApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'DayOfApiError';
    this.status = status;
    this.body = body;
  }
}

const DEFAULT_DEV_BASE_URL = 'http://localhost:3000';

const resolveBaseUrl = () => {
  const explicit =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.EXPO_PUBLIC_BASE_URL;

  if (explicit) return explicit;

  const debuggerHost = Constants.expoGoConfig?.debuggerHost;
  if (!debuggerHost) return DEFAULT_DEV_BASE_URL;

  const host = debuggerHost.split(':')[0];
  return `http://${host}:3000`;
};

const API_BASE_URL = resolveBaseUrl();

const buildUrl = (path: string) => {
  if (!path) {
    throw new Error('Path is required');
  }
  if (/^https?:/i.test(path)) {
    return path;
  }
  if (!path.startsWith('/')) {
    throw new Error('Relative paths must begin with a leading slash');
  }
  return `${API_BASE_URL}${path}`;
};

const normalizeHeaders = (headers?: HeadersInit) => {
  if (!headers) return {};
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  return { ...headers };
};

const parseErrorResponse = async (response: Response) => {
  try {
    const data = await response.json();
    const message =
      typeof data?.message === 'string'
        ? data.message
        : Array.isArray(data?.message)
        ? data.message.join(', ')
        : 'Request failed';
    throw new DayOfApiError(response.status, message, data);
  } catch (error) {
    if (error instanceof DayOfApiError) {
      throw error;
    }
    throw new DayOfApiError(response.status, response.statusText || 'Request failed', null);
  }
};

export const dayOfPublicFetch = async (path: string, options?: RequestInit) => {
  const url = buildUrl(path);
  const headers = {
    'Content-Type': 'application/json',
    'X-IsDayOfDashboard': 'true',
    ...normalizeHeaders(options?.headers),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  return response;
};

export const dayOfAuthFetch = async (
  path: string,
  auth: { token: string; instanceId: string | null },
  options?: RequestInit
) => {
  const url = buildUrl(path);
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${auth.token}`,
    'X-Instance': auth.instanceId ?? '',
    'X-IsDayOfDashboard': 'true',
    ...normalizeHeaders(options?.headers),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  return response;
};

export const dayOfJson = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  return data as T;
};

export const API_BASE = API_BASE_URL;

