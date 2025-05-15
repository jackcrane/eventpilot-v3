import React, { useState } from "react";
import useSWR from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";

const fetcher = (url) =>
  authFetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch response");
    return res.json();
  });

export const useFormResponse = (eventId, campaignId, submissionId) => {
  const key =
    eventId && campaignId && submissionId
      ? `/api/events/${eventId}/campaigns/${campaignId}/submission/${submissionId}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher);
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
      await mutate(); // ← re‑fetch the GET
      return await res.json();
    } finally {
      setMutationLoading(false);
    }
  };

  const _deleteResponse = async () => {
    setDeleteLoading(true);
    try {
      const res = await authFetch(key, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      // remove from cache permanently
      mutate(null, false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const deleteResponse = async () => {
    toast.promise(_deleteResponse(), {
      loading: "Deleting…",
      success: "Deleted",
    });
  };

  return {
    response: data?.response ?? null,
    fields: data?.fields ?? [],
    pii: data?.pii ?? null,
    loading: isLoading,
    error,
    updateResponse,
    deleteResponse,
    mutationLoading,
    deleteLoading,
  };
};
