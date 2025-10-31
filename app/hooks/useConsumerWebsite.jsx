import useSWR from "swr";
import { useMemo } from "react";
import { publicFetch } from "../util/url";

const fetcher = async (url) => {
  const res = await publicFetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.message || "Failed to load website";
    throw new Error(message);
  }
  return res.json();
};

export const useConsumerWebsite = ({ eventSlug, routeKey = "home" }) => {
  if (!eventSlug || !routeKey) {
    return {
      event: null,
      websitePage: null,
      loading: false,
      error: null,
      refetch: async () => {},
      availableRouteKeys: ["home"],
    };
  }

  const encodedRouteKey = encodeURIComponent(routeKey);
  const key = `/api/consumer/events/${eventSlug}/website?routeKey=${encodedRouteKey}`;

  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
  });

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

  return {
    event: data?.event ?? null,
    websitePage: data?.websitePage ?? null,
    loading: isLoading,
    error,
    refetch,
    availableRouteKeys,
  };
};
