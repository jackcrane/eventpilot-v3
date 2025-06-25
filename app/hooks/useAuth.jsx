// AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { authFetch, u } from "../util/url";
import { emitter } from "../util/mitt";
import toast from "react-hot-toast";
import { Link } from "tabler-react-2";

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

  const login = async ({ email, password }) => {
    setMutationLoading(true);
    setError(null);
    const r = await fetch(u("/api/auth/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (r.ok) {
      const { token } = await r.json();
      localStorage.setItem("token", token);
      setUser(null);
      fetchUser();
      emitter.emit("login");
      setMutationLoading(false);
      document.location.href = "/events";
    } else {
      const { message } = await r.json();
      setError(message);
      setMutationLoading(false);
    }
    setMutationLoading(false);
  };

  const register = async ({ name, email, password }) => {
    setMutationLoading(true);
    setError(null);
    const r = await fetch(u("/api/auth/register"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    if (r.ok) {
      setRegistered(true);
    } else {
      const { message } = await r.json();
      setError(message);
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
      fetchUser();
      toast.success(`Email verified, ${name}! We are logging you in now.`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      window.location.href = "/";
    } else {
      const { message, email } = await r.json();
      setMeta({ email });
      setError(message);
      setMutationLoading(false);
    }
  };

  const resendVerificationEmail = async ({ email }) => {
    setMutationLoading(true);
    setError(null);
    const r = await fetch(u("/api/auth/register"), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (r.ok) {
      toast.success("Verification email sent!");
      setMutationLoading(false);
    } else {
      const { message } = await r.json();
      setError(message);
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
      return;
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
    }

    setLoading(false);
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
        email: data.email,
        phoneNumber: data.phoneNumber,
      }),
    });

    if (r.ok) {
      const { user } = await r.json();
      setUser(user);
      if (!user.emailVerified) {
        resendVerificationEmail({ email: user.email });
      }
      setLoading(false);
      setMutationLoading(false);
    } else {
      const { message } = await r.json();
      toast.error(message);
      setError(message);
      setMutationLoading(false);
    }

    setLoading(false);
    setMutationLoading(false);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setLoggedIn(false);
    document.location.href = "/login";
  };

  const requestForgotPassword = async ({ email }) => {
    setMutationLoading(true);
    setError(null);
    const r = await fetch(u("/api/auth/reset-password"), {
      method: "put",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (r.ok) {
      const { message } = await r.json();
      toast.success(message);
      setMutationLoading(false);
      setForgotPasswordWaiting(true);
    } else {
      const { message } = await r.json();
      setError(message);
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
      setMutationLoading(false);
      setForgotPasswordWaiting(false);
      localStorage.removeItem("token");
      setTimeout(() => {
        window.location.href = "/login?from=forgot-password";
      }, 2000);
    } else {
      const { message } = await r.json();
      setError(message);
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
