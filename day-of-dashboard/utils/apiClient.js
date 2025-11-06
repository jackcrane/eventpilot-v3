import Constants from "expo-constants";

export class DayOfApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.name = "DayOfApiError";
    this.status = status;
    this.body = body;
  }
}

const DEFAULT_DEV_BASE_URL = "http://192.168.1.97:3000";

const resolveBaseUrl = () => {
  const explicit =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.EXPO_PUBLIC_BASE_URL;

  return explicit || DEFAULT_DEV_BASE_URL;
};

const API_BASE_URL = resolveBaseUrl();

const buildUrl = (path) => {
  if (!path) {
    throw new Error("Path is required");
  }
  if (/^https?:/i.test(path)) {
    return path;
  }
  if (!path.startsWith("/")) {
    throw new Error("Relative paths must begin with a leading slash");
  }
  return `${API_BASE_URL}${path}`;
};

const normalizeHeaders = (headers) => {
  if (!headers) return {};
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  return { ...headers };
};

const parseErrorResponse = async (response) => {
  try {
    const data = await response.json();
    const message =
      typeof data?.message === "string"
        ? data.message
        : Array.isArray(data?.message)
        ? data.message.join(", ")
        : "Request failed";
    throw new DayOfApiError(response.status, message, data);
  } catch (error) {
    if (error instanceof DayOfApiError) {
      throw error;
    }
    throw new DayOfApiError(
      response.status,
      response.statusText || "Request failed",
      null
    );
  }
};

const logFetchFailure = (url, status, error) => {
  console.log("[POS][apiClient] request failed", {
    url,
    status,
    message: error?.message ?? null,
    name: error?.name ?? null,
  });
};

export const dayOfPublicFetch = async (path, options) => {
  const url = buildUrl(path);
  const headers = {
    "Content-Type": "application/json",
    "X-IsDayOfDashboard": "true",
    ...normalizeHeaders(options?.headers),
  };

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    logFetchFailure(url, null, error);
    throw error;
  }

  if (!response.ok) {
    logFetchFailure(
      url,
      response.status,
      new Error(response.statusText || "Request failed")
    );
    await parseErrorResponse(response);
  }

  return response;
};

export const dayOfAuthFetch = async (path, auth, options) => {
  const url = buildUrl(path);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${auth.token}`,
    "X-Instance": auth.instanceId ?? "",
    "X-IsDayOfDashboard": "true",
    ...normalizeHeaders(options?.headers),
  };

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    logFetchFailure(url, null, error);
    throw error;
  }

  if (!response.ok) {
    logFetchFailure(
      url,
      response.status,
      new Error(response.statusText || "Request failed")
    );
    await parseErrorResponse(response);
  }

  return response;
};

export const dayOfJson = async (response) => {
  const data = await response.json();
  return data;
};

export const API_BASE = API_BASE_URL;
