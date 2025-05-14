import React, { useState } from "react";
import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useFormBuilder = (eventId, campaignId) => {
  const key =
    eventId && campaignId
      ? `/api/events/${eventId}/campaigns/${campaignId}/builder`
      : null;

  const { data, error, isLoading } = useSWR(key, fetcher);

  const updateFields = async (fields) => {
    const res = await authFetch(key, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    const updated = await res.json();
    // update local cache
    mutate(key, updated, false);
    return updated;
  };

  const [mutationLoading, setMutationLoading] = useState(false);

  const submitForm = async (values) => {
    setMutationLoading(true);
    try {
      const url = `/api/events/${eventId}/campaigns/${campaignId}/submission`;
      const res = await authFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const data = await res.json();
      setMutationLoading(false);
      return data;
    } catch (err) {
      setMutationLoading(false);
      throw err;
    }
  };

  return {
    fields: data?.fields ?? [],
    loading: isLoading,
    error,
    updateFields,
    submitForm,
    mutationLoading,
  };
};
