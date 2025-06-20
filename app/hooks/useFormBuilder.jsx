import React, { useState } from "react";
import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import { getPII, usePII } from "./usePII";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useFormBuilder = (eventId) => {
  const key = eventId ? `/api/events/${eventId}/builder` : null;

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
    const pii = await getPII();
    setMutationLoading(true);
    try {
      const url = `/api/events/${eventId}/submission`;
      const res = await authFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values, pii }),
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
