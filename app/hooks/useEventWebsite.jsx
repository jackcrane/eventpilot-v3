import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import toast from "react-hot-toast";
import { authFetch } from "../util/url";

const fetcher = async (url) => {
  const res = await authFetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.message || "Failed to load website";
    throw new Error(message);
  }
  return res.json();
};

export const useEventWebsite = ({ eventId, routeKey = "home" }) => {
  if (!eventId || !routeKey) {
    return {
      websitePage: null,
      loading: false,
      saving: false,
      error: null,
      refetch: async () => {},
      saveWebsite: async () => false,
    };
  }

  const encodedRouteKey = routeKey ? encodeURIComponent(routeKey) : "";
  const key =
    eventId && routeKey
      ? `/api/events/${eventId}/website?routeKey=${encodedRouteKey}`
      : null;

  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
  });

  const mutationUrl = eventId ? `/api/events/${eventId}/website` : null;

  const { trigger, isMutating } = useSWRMutation(
    mutationUrl,
    async (url, { arg }) => {
      const res = await authFetch(url, {
        method: "PUT",
        body: JSON.stringify(arg),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body?.message || "Failed to save website";
        throw new Error(message);
      }
      return res.json();
    }
  );

  const saveWebsite = async (draft) => {
    if (!eventId || !routeKey) return false;
    try {
      const promise = trigger(
        { routeKey, data: draft },
        {
          throwOnError: true,
        }
      );
      await toast.promise(promise, {
        loading: "Saving website…",
        success: "Website saved",
        error: (err) => err?.message || "Failed to save website",
      });
      await refetch();
      return true;
    } catch {
      return false;
    }
  };

  return {
    websitePage: data?.websitePage ?? null,
    loading: isLoading,
    saving: isMutating,
    error,
    refetch,
    saveWebsite,
  };
};
