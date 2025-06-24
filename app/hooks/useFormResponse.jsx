// /app/hooks/useFormResponse.jsx
import React, { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";

const fetcher = (url) =>
  authFetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch response");
    return res.json();
  });

export const useFormResponse = (eventId, submissionId) => {
  if (!eventId) throw new Error("useFormResponse requires an eventId");
  if (!submissionId) throw new Error("useFormResponse requires a submissionId");

  const key =
    eventId && submissionId
      ? `/api/events/${eventId}/submission/${submissionId}`
      : null;
  const listKey = eventId ? `/api/events/${eventId}/submission` : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher);
  const { mutate: refreshList } = useSWRConfig();

  const [mutationLoading, setMutationLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const updateResponse = (values) => {
    setMutationLoading(true);
    const promise = (async () => {
      const res = await authFetch(key, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      if (!res.ok) throw new Error("Update failed");
      const json = await res.json();
      await mutate(); // re-fetch single
      if (listKey) await refreshList(listKey); // re-fetch list
      return json;
    })();

    return toast
      .promise(promise, {
        loading: "Updating response…",
        success: "Response updated",
        error: "Update failed",
      })
      .finally(() => setMutationLoading(false));
  };

  const updateShiftRegistrations = (shifts) => {
    setMutationLoading(true);
    const promise = (async () => {
      const res = await authFetch(key, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shifts }),
      });
      if (!res.ok) throw new Error("Update failed");
      const json = await res.json();
      await mutate(); // re-fetch single
      if (listKey) await refreshList(listKey); // re-fetch list
      return json;
    })();

    return toast
      .promise(promise, {
        loading: "Updating shifts…",
        success: "Shifts updated",
        error: "Update failed",
      })
      .finally(() => setMutationLoading(false));
  };

  const _deleteResponse = async () => {
    setDeleteLoading(true);
    try {
      const res = await authFetch(key, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await mutate(null, false); // remove single from cache
      if (listKey) await refreshList(listKey); // re-fetch list
    } finally {
      setDeleteLoading(false);
    }
  };

  const deleteResponse = () =>
    toast.promise(_deleteResponse(), {
      loading: "Deleting…",
      success: "Deleted",
      error: "Delete failed",
    });

  return {
    response: data?.response ?? null,
    fields: data?.fields ?? [],
    pii: data?.pii ?? null,
    shifts: data?.shifts ?? [],
    groupedShifts: data?.groupedShifts ?? [],
    updateShiftRegistrations,
    loading: isLoading,
    error,
    updateResponse,
    deleteResponse,
    mutationLoading,
    deleteLoading,
  };
};
