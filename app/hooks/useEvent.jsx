import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import { useState } from "react";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useEvent = ({ eventId }) => {
  const key = `/api/events/${eventId}`;
  const [mutationLoading, setMutationLoading] = useState(false);

  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(`/api/events/${eventId}`, fetcher);

  const updateEvent = async (data) => {
    setMutationLoading(true);
    try {
      const promise = authFetch(key, {
        method: "PUT",
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Updating...",
        success: "Updated successfully",
        error: "Error",
      });

      await mutate(key); // Invalidate and refetch
      return true;
    } catch {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };

  return {
    event: data?.event,
    loading: isLoading,
    updateEvent,
    mutationLoading,
    error,
    refetch,
  };
};
