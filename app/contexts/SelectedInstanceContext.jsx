// src/contexts/SelectedInstanceContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { useInstance } from "../hooks/useInstance";
import { useParsedUrl } from "../hooks/useParsedUrl";
import { authFetch } from "../util/url";

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

  // Local fetcher for instances list to avoid circular dependency with useInstances
  const instancesKey = typeof eventId === "string" ? `/api/events/${eventId}/instances` : null;
  const { data: instancesResponse } = useSWR(
    instancesKey,
    (url) => authFetch(url).then((r) => r.json())
  );
  const instances = instancesResponse?.instances ?? null;

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

  // Ensure an instance is always selected: prefer next upcoming (or active), else most recent past
  useEffect(() => {
    if (!eventId) return; // wait for event id
    if (!instances || !Array.isArray(instances)) return; // wait for instances

    const currentId = instanceDropdownValue?.id;
    const currentIsValid = currentId && instances.some((i) => i.id === currentId);
    if (currentIsValid) return; // keep current selection if valid

    if (instances.length === 0) return; // nothing to select

    const now = new Date();

    // Prefer flagged next/active instance from server if present
    const nextFlagged = instances.find((i) => i.isNext);

    // Else choose earliest future by startTime
    const future = instances
      .filter((i) => i?.startTime && new Date(i.startTime).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    // Else choose most recent past by endTime (fallback to startTime if endTime missing)
    const past = instances
      .filter((i) => i?.endTime && new Date(i.endTime).getTime() < now.getTime())
      .sort((a, b) => new Date(b.endTime) - new Date(a.endTime));

    const fallbackPastByStart = instances
      .filter((i) => i?.startTime && new Date(i.startTime).getTime() < now.getTime())
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    const candidate =
      nextFlagged ||
      future?.[0] ||
      past?.[0] ||
      fallbackPastByStart?.[0] ||
      instances[0];

    if (candidate && candidate.id !== currentId) {
      setInstanceDropdownValue({ id: candidate.id });
    }
  }, [eventId, instances, instanceDropdownValue?.id]);

  return (
    <SelectedInstanceContext.Provider
      value={{
        instance: typeof instance === "object" ? instance : null,
        setInstance: (value) =>
          typeof value === "string"
            ? setInstanceDropdownValue({ id: value })
            : setInstanceDropdownValue(value),
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
