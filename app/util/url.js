import toast from "react-hot-toast";
import { emitter } from "./mitt";

export const u = (path) =>
  // eslint-disable-next-line no-undef
  process.env.NODE_ENV === "development"
    ? `http://localhost:3000${path}`
    : path;

export const authFetch = async (url, options, redirect = true) => {
  const token = localStorage.getItem("token");
  const instance = localStorage.getItem("instance");
  const res = await fetch(u(url), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
      ...(token && token !== "null" ? { Authorization: `Bearer ${token}` } : {}),
      "X-Instance": instance,
    },
  });
  if (res.status === 401 && redirect) {
    localStorage.removeItem("token");
    window.logout && window.logout();
    emitter.emit("logout");
  }
  // 402 (Payment Required) handling is event-scoped now; do not show account-level toasts here
  if (res.status === 500) {
    toast.error("Internal server error.");
  }
  return res;
};

export const authFetchWithoutContentType = async (url, options) => {
  const token = localStorage.getItem("token");
  const res = await fetch(u(url), {
    ...options,
    headers: {
      ...options?.headers,
      ...(token && token !== "null" ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.logout && window.logout();
    emitter.emit("logout");
  }
  return res;
};

// For unauthenticated/public endpoints: never attach Authorization header
export const publicFetch = async (url, options) => {
  const instance = localStorage.getItem("instance");
  const res = await fetch(u(url), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
      "X-Instance": instance,
    },
  });
  return res;
};
