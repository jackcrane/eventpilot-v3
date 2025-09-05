import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import toast from "react-hot-toast";
import { authFetch } from "../util/url";

const fetcher = async (key) => {
  const res = await authFetch(key, { method: "GET" });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Failed to load saved segments");
  return json; // { savedSegments }
};

const createSaved = async (key, { arg }) => {
  const res = await authFetch(key, { method: "POST", body: JSON.stringify(arg) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Failed to save");
  return json; // { savedSegment }
};

const patchSaved = async (key, { arg }) => {
  const res = await authFetch(key, { method: "PATCH", body: JSON.stringify(arg) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || "Failed to update");
  return json; // { savedSegment }
};

export const useCrmSavedSegments = ({ eventId }) => {
  const key = eventId ? `/api/events/${eventId}/crm/saved-segments` : null;
  const { data, error, isLoading, mutate } = useSWR(key, fetcher);

  const { trigger: createTrigger, isMutating: creating } = useSWRMutation(
    key,
    createSaved
  );

  const createSavedSegment = async ({ title, prompt, ast, favorite = false }) => {
    try {
      const payload = { prompt, ast, favorite };
      if (title && title.trim()) payload.title = title.trim();
      const promise = createTrigger(payload);
      const { savedSegment } = await toast.promise(promise, {
        loading: "Saving search...",
        success: "Saved",
        error: (e) => e?.message || "Failed to save",
      });
      await mutate();
      return { ok: true, savedSegment };
    } catch (e) {
      return { ok: false, error: e };
    }
  };

  const updateSavedSegment = async (segmentId, data) => {
    try {
      const promise = patchSaved(`${key}/${segmentId}`, { arg: data });
      const { savedSegment } = await toast.promise(promise, {
        loading: "Updating...",
        success: "Updated",
        error: (e) => e?.message || "Failed to update",
      });
      await mutate();
      return { ok: true, savedSegment };
    } catch (e) {
      return { ok: false, error: e };
    }
  };

  const markUsed = async (segmentId) => {
    return updateSavedSegment(segmentId, { lastUsed: new Date().toISOString() });
  };

  const suggestTitle = async ({ prompt, ast }) => {
    if (!eventId) return { ok: false };
    try {
      const res = await authFetch(`/api/events/${eventId}/crm/saved-segments/suggest-title`, {
        method: "POST",
        body: JSON.stringify({ prompt, ast }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to suggest title");
      return { ok: true, title: json.title };
    } catch (e) {
      return { ok: false, error: e };
    }
  };

  return {
    savedSegments: data?.savedSegments || [],
    loading: isLoading,
    error,
    refetch: () => mutate(),
    createSavedSegment,
    updateSavedSegment,
    markUsed,
    suggestTitle,
    mutationLoading: creating,
  };
};
