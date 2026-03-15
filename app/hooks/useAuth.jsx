// AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { authFetch, u } from "../util/url";
import { emitter } from "../util/mitt";
import toast from "react-hot-toast";
import { Link } from "tabler-react-2";
import { capturePosthogEvent, resetPosthogUser } from "../util/posthog";

// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [meta, setMeta] = useState(null);
  const [forgotPasswordWaiting, setForgotPasswordWaiting] = useState(false);

  const getToken = () => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    if (token) {
      localStorage.setItem("token", token);
      url.searchParams.delete("token");
      window.history.replaceState({}, document.title, url);
    }
  };

  const formatErrorMessage = (value) => {
    if (!value) return "An unexpected error occurred.";
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      const parts = value
        .map((item) =>
          typeof item === "object" && item !== null
            ? formatErrorMessage(item.message || item.code)
            : formatErrorMessage(item)
        )
        .filter(Boolean);
      return parts.join(", ") || "An unexpected error occurred.";
    }
    if (typeof value === "object") {
      if (value.message) return formatErrorMessage(value.message);
      if (value.error) return formatErrorMessage(value.error);
      return JSON.stringify(value);
    }
    return String(value);
  };

  const normalizeEmail = (value) => value?.trim().toLowerCase() || "";
  const getEmailDomain = (value) =>
    typeof value === "string" && value.includes("@")
      ? value.split("@").pop()
      : null;

  const login = async ({ email, password }) => {
    setMutationLoading(true);
    setError(null);
    const normalizedEmail = normalizeEmail(email);
    capturePosthogEvent("ui_auth_login_attempted", {
      email_domain: getEmailDomain(normalizedEmail),
    });
    const r = await fetch(u("/api/auth/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: normalizedEmail, password }),
    });

    if (r.ok) {
      const { token } = await r.json();
      localStorage.setItem("token", token);
      setUser(null);
      const nextUser = await fetchUser();
      emitter.emit("login");
      capturePosthogEvent("ui_auth_login_succeeded", {
        user_id: nextUser?.id,
        account_type: nextUser?.accountType,
      });
      setMutationLoading(false);
      document.location.href = "/events";
    } else {
      const { message } = await r.json();
      setError(formatErrorMessage(message));
      capturePosthogEvent("ui_auth_login_failed", {
        email_domain: getEmailDomain(normalizedEmail),
        reason: formatErrorMessage(message),
      });
      setMutationLoading(false);
    }
    setMutationLoading(false);
  };

  const register = async ({ name, email, password }) => {
    setMutationLoading(true);
    setError(null);
    const normalizedEmail = normalizeEmail(email);
    const r = await fetch(u("/api/auth/register"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email: normalizedEmail, password }),
    });

    if (r.ok) {
      setRegistered(true);
      capturePosthogEvent("ui_auth_registered", {
        email_domain: getEmailDomain(normalizedEmail),
      });
    } else {
      const { message } = await r.json();
      setError(formatErrorMessage(message));
      setMutationLoading(false);
    }
    setMutationLoading(false);
  };

  const verifyEmail = async (verifyToken) => {
    setMutationLoading(true);
    setError(null);
    const r = await fetch(u("/api/auth/verify?token=" + verifyToken), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (r.ok) {
      const { token, name } = await r.json();
      localStorage.setItem("token", token);
      const nextUser = await fetchUser();
      toast.success(`Email verified, ${name}! We are logging you in now.`);
      capturePosthogEvent("ui_auth_email_verified", {
        user_id: nextUser?.id,
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      window.location.href = "/";
    } else {
      const { message, email } = await r.json();
      setMeta({ email });
      setError(formatErrorMessage(message));
      setMutationLoading(false);
    }
  };

  const resendVerificationEmail = async ({ email }) => {
    setMutationLoading(true);
    setError(null);
    const normalizedEmail = normalizeEmail(email);
    const r = await fetch(u("/api/auth/register"), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    if (r.ok) {
      toast.success("Verification email sent!");
      capturePosthogEvent("ui_auth_verification_resent", {
        email_domain: getEmailDomain(normalizedEmail),
      });
      setMutationLoading(false);
    } else {
      const { message } = await r.json();
      setError(formatErrorMessage(message));
      setMutationLoading(false);
    }
  };

  const fetchUser = async () => {
    getToken();

    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      setLoggedIn(false);
      setUser(null);
      return null;
    }

    const r = await fetch(u("/api/auth/me"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (r.ok) {
      const { user } = await r.json();
      setUser(user);
      setLoggedIn(true);
      setLoading(false);
      return user;
    }

    setLoading(false);
    return null;
  };

  const updateUser = async (data) => {
    setMutationLoading(true);
    setError(null);
    const r = await authFetch("/api/auth/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: data.name,
        email: normalizeEmail(data.email),
        phoneNumber: data.phoneNumber,
      }),
    });

    if (r.ok) {
      const { user } = await r.json();
      setUser(user);
      if (!user.emailVerified) {
        resendVerificationEmail({ email: user.email });
      }
      capturePosthogEvent("ui_auth_profile_updated", {
        user_id: user.id,
        changed_fields: Object.keys(data || {}),
      });
      setLoading(false);
      setMutationLoading(false);
    } else {
      const { message } = await r.json();
      const formatted = formatErrorMessage(message);
      toast.error(formatted);
      setError(formatted);
      setMutationLoading(false);
    }

    setLoading(false);
    setMutationLoading(false);
  };

  const logout = () => {
    capturePosthogEvent("ui_auth_logged_out", {
      user_id: user?.id,
    });
    resetPosthogUser();
    localStorage.removeItem("token");
    setUser(null);
    setLoggedIn(false);
    document.location.href = "/login";
  };

  const requestForgotPassword = async ({ email }) => {
    setMutationLoading(true);
    setError(null);
    const normalizedEmail = normalizeEmail(email);
    const r = await fetch(u("/api/auth/reset-password"), {
      method: "put",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    if (r.ok) {
      const { message } = await r.json();
      toast.success(message);
      capturePosthogEvent("ui_auth_forgot_password_requested", {
        email_domain: getEmailDomain(normalizedEmail),
      });
      setMutationLoading(false);
      setForgotPasswordWaiting(true);
    } else {
      const { message } = await r.json();
      setError(formatErrorMessage(message));
      setMutationLoading(false);
    }

    setMutationLoading(false);
  };

  const confirmForgotPassword = async ({ token, password }) => {
    setMutationLoading(true);
    setError(null);
    const r = await fetch(u("/api/auth/reset-password"), {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, password }),
    });

    if (r.ok) {
      const { message } = await r.json();
      toast.success(message);
      capturePosthogEvent("ui_auth_forgot_password_completed");
      setMutationLoading(false);
      setForgotPasswordWaiting(false);
      localStorage.removeItem("token");
      setTimeout(() => {
        window.location.href = "/login?from=forgot-password";
      }, 2000);
    } else {
      const { message } = await r.json();
      setError(formatErrorMessage(message));
      setMutationLoading(false);
    }

    setMutationLoading(false);
  };

  useEffect(() => {
    window.fetchUser = fetchUser;
    fetchUser();
  }, []);

  useEffect(() => {
    window.logout = logout;
    emitter.on("logout", () => {
      logout();
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        loggedIn,
        error,
        mutationLoading,
        register,
        registered,
        verifyEmail,
        resendVerificationEmail,
        meta,
        updateUser,
        requestForgotPassword,
        forgotPasswordWaiting,
        confirmForgotPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  return useContext(AuthContext);
};
