import useSWRMutation from "swr/mutation";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";

const postSegment = async (key, { arg }) => {
  const res = await authFetch(key, {
    method: "POST",
    body: JSON.stringify({ filter: arg?.filter, debug: arg?.debug ?? false }),
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.message || res.statusText || "Failed to run segment";
    throw new Error(msg);
  }
  return json; // { crmPersons, total, debug? }
};

export const useCrmSegment = ({ eventId }) => {
  const key = eventId ? `/api/events/${eventId}/crm/segments` : null;
  const { trigger, data, error, isMutating, reset } = useSWRMutation(
    key,
    postSegment
  );

  const run = async ({ filter, debug }) => {
    if (!filter) return { ok: false, error: new Error("Missing filter AST") };
    try {
      const res = await trigger({ filter, debug });
      return { ok: true, ...res };
    } catch (e) {
      return { ok: false, error: e };
    }
  };

  return {
    data,
    error,
    loading: isMutating,
    run,
    reset,
  };
};
