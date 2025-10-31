import useSWR, { mutate as mutateGlobal } from "swr";
import useSWRMutation from "swr/mutation";
import toast from "react-hot-toast";
import { useMemo } from "react";
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
      availableRouteKeys: ["home"],
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

  if (process.env.NODE_ENV !== "production") {
    console.log("[useEventWebsite] state", {
      eventId,
      routeKey,
      key,
      isLoading,
      hasData: !!data,
      data,
      error,
    });
  }

  const availableRouteKeys = useMemo(() => {
    const rawKeys = Array.isArray(data?.availableRouteKeys)
      ? data.availableRouteKeys
      : [];
    const normalized = rawKeys
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value.length > 0)
      .map((value) => value.slice(0, 100));
    const unique = Array.from(new Set(["home", ...normalized]));
    return unique;
  }, [data?.availableRouteKeys]);

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

  const saveWebsite = async (draft, overrideRouteKey) => {
    const targetRouteKey =
      typeof overrideRouteKey === "string" && overrideRouteKey.trim().length > 0
        ? overrideRouteKey.trim()
        : routeKey;

    if (!eventId || !targetRouteKey) return false;
    try {
      const promise = trigger(
        { routeKey: targetRouteKey, data: draft },
        {
          throwOnError: true,
        }
      );
      const response = await toast.promise(promise, {
        loading: "Saving website…",
        success: "Website saved",
        error: (err) => err?.message || "Failed to save website",
      });
      const encodedTargetKey = encodeURIComponent(targetRouteKey);
      const targetKey = `/api/events/${eventId}/website?routeKey=${encodedTargetKey}`;
      await mutateGlobal(targetKey, response, { revalidate: true });
      if (targetRouteKey !== routeKey) {
        await refetch();
      }
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
    availableRouteKeys,
  };
};
