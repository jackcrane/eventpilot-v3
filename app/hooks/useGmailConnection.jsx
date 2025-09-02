import useSWR, { mutate as globalMutate } from "swr";
import toast from "react-hot-toast";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useGmailConnection = ({ eventId } = {}) => {
  const key = typeof eventId === "string" ? `/api/events/${eventId}/gmail` : null;
  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(key, fetcher);

  const gmailConnection = data?.gmailConnection ?? null;

  const connect = async () => {
    if (!eventId) return;
    const p = authFetch(`/api/events/${eventId}/gmail/start`, {
      method: "GET",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to start Google OAuth");
        const { url } = await r.json();
        if (!url) throw new Error("Missing OAuth URL");
        window.location.href = url;
        return true;
      })
      .catch((e) => {
        console.error(e);
        throw e;
      });
    return toast.promise(p, {
      loading: "Opening Google OAuth...",
      success: "Redirecting to Google...",
      error: (e) => e?.message || "Failed to start Google OAuth",
    });
  };

  const disconnect = async () => {
    if (!eventId) return false;
    const p = authFetch(`/api/events/${eventId}/gmail`, { method: "DELETE" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to disconnect");
        await refetch();
        return true;
      })
      .catch((e) => {
        console.error(e);
        throw e;
      });
    return toast.promise(p, {
      loading: "Disconnecting Gmail...",
      success: "Disconnected Gmail",
      error: (e) => e?.message || "Failed to disconnect",
    });
  };

  return {
    gmailConnection,
    loading: isLoading,
    error,
    refetch,
    connect,
    disconnect,
  };
};

