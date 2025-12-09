import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";

const fetcher = (url) =>
  authFetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to load registration");
    return res.json();
  });

export const useRegistrationResponse = (eventId, registrationId) => {
  if (!eventId) throw new Error("useRegistrationResponse requires an eventId");
  if (!registrationId)
    throw new Error("useRegistrationResponse requires a registrationId");

  const key =
    eventId && registrationId
      ? `/api/events/${eventId}/registration/${registrationId}`
      : null;
  const listKey = eventId ? `/api/events/${eventId}/registration/registrations` : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher);
  const { mutate: refresh } = useSWRConfig();

  const [mutationLoading, setMutationLoading] = useState(false);

  const updateResponse = (values) => {
    setMutationLoading(true);
    const promise = (async () => {
      const res = await authFetch(key, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      if (!res.ok) throw new Error("Update failed");
      await mutate();
      if (listKey) await refresh(listKey);
      return res.json();
    })();

    return toast
      .promise(promise, {
        loading: "Updating response…",
        success: "Response updated",
        error: "Update failed",
      })
      .finally(() => setMutationLoading(false));
  };

  return {
    response: data?.registration ?? null,
    fields: data?.fields ?? [],
    loading: isLoading,
    error,
    updateResponse,
    mutationLoading,
  };
};
