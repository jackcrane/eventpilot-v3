import useSWRMutation from "swr/mutation";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";

const postGenerative = async (key, { arg }) => {
  const res = await authFetch(key, {
    method: "POST",
    body: JSON.stringify({
      prompt: arg?.prompt,
      temperature: arg?.temperature ?? 0.1,
      includeContext: arg?.includeContext ?? true,
      debug: arg?.debug ?? false,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.message || res.statusText;
    throw new Error(msg);
  }
  return json; // { segment, results }
};

export const useCrmGenerativeSegment = ({ eventId }) => {
  const key = eventId
    ? `/api/events/${eventId}/crm/segments/generative`
    : null;

  const { trigger, data, error, isMutating, reset } = useSWRMutation(
    key,
    postGenerative
  );

  const generate = async ({ prompt, temperature, includeContext, debug }) => {
    if (!prompt || !prompt.trim()) {
      toast.error("Please enter a prompt");
      return { ok: false };
    }
    try {
      const promise = trigger({ prompt, temperature, includeContext, debug });
      const res = await toast.promise(promise, {
        loading: "Generating with AI...",
        success: "Segment generated",
        error: (e) => e?.message || "Failed to generate",
      });
      return { ok: true, ...res };
    } catch (e) {
      return { ok: false, error: e };
    }
  };

  return {
    data, // { segment, results }
    error,
    loading: isMutating,
    generate,
    reset,
  };
};

