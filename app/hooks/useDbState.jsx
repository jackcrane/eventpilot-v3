import useSWR from "swr";
import { useParams } from "react-router-dom";
import { authFetch } from "../util/url";

// Usage: const [value, setValue, loading] = useDbState(initialValue, key)
export const useDbState = (initialValue, key) => {
  const { eventId } = useParams();

  const swrKey = eventId ? `/api/events/${eventId}/configuration` : null;

  const fetcher = async (url) => {
    const res = await authFetch(url, { method: "GET" });
    if (!res.ok) throw new Error("failed");
    const json = await res.json();
    return json?.configuration ?? null;
  };

  const { data, isLoading, mutate } = useSWR(swrKey, fetcher);

  const currentValue = data?.[key] ?? initialValue;

  const setValue = async (next) => {
    if (!swrKey) return;
    const nextVal = typeof next === "function" ? next(currentValue) : next;
    // Optimistic update
    await mutate({ ...(data || {}), [key]: nextVal }, { revalidate: false });
    try {
      const res = await authFetch(swrKey, {
        method: "PUT",
        body: JSON.stringify({ [key]: nextVal }),
      });
      if (!res.ok) throw new Error("save failed");
      await mutate();
    } catch (e) {
      // Rollback by revalidating
      await mutate();
    }
  };

  return [currentValue, setValue, isLoading];
};
