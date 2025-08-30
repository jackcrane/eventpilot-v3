// src/contexts/SelectedInstanceContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { useInstance } from "../hooks/useInstance";
import { useParams } from "react-router-dom";
import { useParsedUrl } from "../hooks/useParsedUrl";

const SelectedInstanceContext = createContext();

/** Wrap your app in this to provide `useSelectedInstance()` everywhere */
export const SelectedInstanceProvider = ({ children }) => {
  const [instanceDropdownValue, setInstanceDropdownValue] = useState(null);
  const { mutate } = useSWRConfig();
  const url = useParsedUrl(window.location.pathname);
  const eventId = url.events;
  const { instance, loading } = useInstance({
    eventId,
    instanceId: instanceDropdownValue?.id,
  });

  useEffect(() => {
    if (!instanceDropdownValue) return;
    localStorage.setItem("instance", instanceDropdownValue?.id);
    // Invalidate all SWR cache entries when the selected instance changes
    // This revalidates every key in the cache (SWR v2 API)
    mutate(() => true, undefined, { revalidate: true });
  }, [instanceDropdownValue]);

  useEffect(() => {
    const instance = localStorage.getItem("instance");
    if (instance) {
      setInstanceDropdownValue({ id: instance });
    }
  }, []);

  return (
    <SelectedInstanceContext.Provider
      value={{
        instance: typeof instance === "object" ? instance : null,
        setInstance: setInstanceDropdownValue,
        instanceDropdownValue,
        loading,
        eventId: typeof eventId === "string" ? eventId : null,
      }}
    >
      {children}
    </SelectedInstanceContext.Provider>
  );
};

/** Usage:
 * const { instance, setInstance } = useSelectedInstance();
 * @returns { instance, setInstance }
 */
export const useSelectedInstance = () => {
  const context = useContext(SelectedInstanceContext);
  if (!context) {
    throw new Error(
      "useSelectedInstance must be used within a SelectedInstanceProvider"
    );
  }
  return context;
};

export const SelectedInstanceDebugger = () => {
  const { instance, loading, eventId } = useSelectedInstance();
  return (
    <div>
      <pre>{JSON.stringify({ instance, loading, eventId }, null, 2)}</pre>
    </div>
  );
};
