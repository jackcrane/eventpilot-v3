import React, { useState } from "react";
import useSWR from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) =>
  authFetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch response");
    return res.json();
  });

/**
 * Hook to GET/PUT/DELETE a single form submission.
 * @param {string} eventId
 * @param {string} campaignId
 * @param {string} submissionId
 */
export const useFormResponse = (eventId, campaignId, submissionId) => {
  const key =
    eventId && campaignId && submissionId
      ? `/api/events/${eventId}/campaigns/${campaignId}/submission/${submissionId}`
      : null;

  const { data, error, isLoading } = useSWR(key, fetcher);

  const [mutationLoading, setMutationLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const updateResponse = async (values) => {
    setMutationLoading(true);
    try {
      const res = await authFetch(key, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      if (!res.ok) throw new Error("Update failed");
      const json = await res.json();
      setMutationLoading(false);
      // revalidate
      await mutate(key);
      return json;
    } catch (e) {
      setMutationLoading(false);
      throw e;
    }
  };

  const deleteResponse = async () => {
    setDeleteLoading(true);
    try {
      const res = await authFetch(key, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteLoading(false);
      // remove from cache
      await mutate(key, null, { revalidate: false });
    } catch (e) {
      setDeleteLoading(false);
      throw e;
    }
  };

  return {
    response: data?.response ?? null,
    fields: data?.fields ?? [],
    loading: isLoading,
    error,
    updateResponse,
    deleteResponse,
    mutationLoading,
    deleteLoading,
  };
};
