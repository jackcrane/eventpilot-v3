import useSWR, { mutate as globalMutate } from "swr";
import { useCallback, useState } from "react";
import { publicFetch } from "../util/url";

const fetcher = (url) =>
  publicFetch(url)
    .then(async (r) => {
      if (!r.ok) throw new Error("not-found");
      return r.json();
    })
    .catch((e) => {
      throw e;
    });

const buildKey = (eventId, code) =>
  eventId && code
    ? `/api/events/${eventId}/registration/coupon/lookup?code=${encodeURIComponent(
        code
      )}`
    : null;

export const useCouponCodeLookup = ({ eventId }) => {
  const [key, setKey] = useState(null);

  const { data, error, isLoading } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const lookup = useCallback(
    async (c) => {
      const trimmed = (c || "").trim();
      const k = buildKey(eventId, trimmed);
      if (!k) return null;
      setKey(k);
      try {
        const res = await fetcher(k);
        await globalMutate(k, res, false);
        return res;
      } catch (e) {
        await globalMutate(k, null, false);
        return null;
      }
    },
    [eventId]
  );

  const reset = useCallback(() => {
    setKey(null);
  }, []);

  return {
    coupon: data?.coupon,
    loading: isLoading,
    error,
    lookup,
    reset,
  };
};

