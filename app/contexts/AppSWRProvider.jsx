import { useCallback, useEffect, useMemo, useState } from "react";
import { SWRConfig } from "swr";

const SWR_STORAGE_KEY = "eventpilot-swr-cache";

const createLocalStorageProvider = () => {
  if (typeof window === "undefined") {
    return new Map();
  }

  let entries = [];

  try {
    const cached = window.localStorage.getItem(SWR_STORAGE_KEY);

    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        entries = parsed;
      }
    }
  } catch (error) {
    // Swallow JSON and quota errors so the cache never breaks renders.
    console.warn("Unable to restore SWR cache from storage", error);
  }

  const map = new Map(entries);

  const persist = () => {
    try {
      const serialised = JSON.stringify(Array.from(map.entries()));
      window.localStorage.setItem(SWR_STORAGE_KEY, serialised);
    } catch (error) {
      // Ignore quota errors to keep runtime stable.
      console.warn("Unable to persist SWR cache to storage", error);
    }
  };

  const originalSet = map.set.bind(map);
  map.set = (key, value) => {
    const result = originalSet(key, value);
    persist();
    return result;
  };

  const originalDelete = map.delete.bind(map);
  map.delete = (key) => {
    const result = originalDelete(key);
    persist();
    return result;
  };

  const originalClear = map.clear.bind(map);
  map.clear = () => {
    originalClear();
    persist();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      persist();
    }
  };

  window.addEventListener("beforeunload", persist);
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  return map;
};

export const AppSWRProvider = ({ children }) => {
  const [revalidationCount, setRevalidationCount] = useState(0);

  const revalidationMiddleware = useCallback(
    (useSWRNext) => (key, fetcher, config) => {
      const swr = useSWRNext(key, fetcher, config);

      useEffect(() => {
        if (!swr.isValidating) {
          return undefined;
        }

        setRevalidationCount((count) => count + 1);

        return () => {
          setRevalidationCount((count) => Math.max(0, count - 1));
        };
      }, [swr.isValidating, setRevalidationCount]);

      return swr;
    },
    [setRevalidationCount]
  );

  const swrConfigValue = useMemo(
    () => ({
      provider: createLocalStorageProvider,
      keepPreviousData: true,
      revalidateIfStale: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      use: [revalidationMiddleware],
    }),
    [revalidationMiddleware]
  );

  const revalidating = revalidationCount > 0;

  return (
    <SWRConfig value={swrConfigValue}>
      {children}
      {revalidating && (
        <span
          style={{
            position: "fixed",
            bottom: 12,
            right: 12,
            padding: "6px 10px",
            borderRadius: 4,
            background: "rgba(0, 0, 0, 0.75)",
            color: "white",
            fontSize: 12,
          }}
        >
          Loading the most recent data...
        </span>
      )}
    </SWRConfig>
  );
};
