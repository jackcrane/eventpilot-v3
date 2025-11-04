import { useCallback } from "react";
import useSWRMutation from "swr/mutation";
import toast from "react-hot-toast";
import { authFetch } from "../util/url";

const createDraftMutation = async (url, { arg }) => {
  const res = await authFetch(url, {
    method: "POST",
    body: JSON.stringify({ ...arg, finalized: false }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof json?.message === "string"
        ? json.message
        : "Failed to create event draft";
    throw new Error(message);
  }
  return json?.event;
};

const finalizeMutation = async (url, { arg }) => {
  const res = await authFetch(url, {
    method: "POST",
    body: JSON.stringify({ ...arg, finalized: true }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof json?.message === "string"
        ? json.message
        : "Failed to finalize event";
    throw new Error(message);
  }
  return json?.event;
};

export const useEventBuilder = ({ eventId } = {}) => {
  const {
    trigger: draftTrigger,
    isMutating: savingDraft,
  } = useSWRMutation("/api/events", createDraftMutation);

  const {
    trigger: finalizeTrigger,
    isMutating: finalizing,
  } = useSWRMutation(
    eventId ? `/api/events/${eventId}/finalize` : null,
    finalizeMutation
  );

  const createDraft = useCallback(
    async (payload) => {
      try {
        return await draftTrigger(payload);
      } catch (error) {
        toast.error(error?.message || "Failed to create event draft");
        throw error;
      }
    },
    [draftTrigger]
  );

  const finalize = useCallback(
    async (payload) => {
      if (!eventId) {
        const error = new Error("Missing event identifier");
        toast.error(error.message);
        throw error;
      }
      try {
        const promise = finalizeTrigger(payload);
        return await toast.promise(promise, {
          loading: "Creating event…",
          success: "Event created successfully",
          error: (err) =>
            err?.message ? String(err.message) : "Error creating event",
        });
      } catch (error) {
        throw error;
      }
    },
    [eventId, finalizeTrigger]
  );

  return {
    createDraft,
    finalize,
    mutationLoading: savingDraft || finalizing,
  };
};
