import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import { useState } from "react";
import toast from "react-hot-toast";
import { dezerialize } from "zodex";

const fetcher = (url) => authFetch(url).then((r) => r.json());
const fetchSchema = async ([url]) => {
  const res = await authFetch(url, {
    method: "QUERY",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch schema");
  const raw = await res.json();
  return dezerialize(raw);
};

export const useParticipantRegistrationForm = ({ eventId }) => {
  const key = `/api/events/${eventId}/registration/form`;
  const { data, error, isLoading } = useSWR(key, fetcher);
  const { data: schema, loading: schemaLoading } = useSWR(
    [key, "schema"],
    fetchSchema
  );
  const [mutationLoading, setMutationLoading] = useState(false);

  const updateFields = async (data) => {
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

      await mutate(key);
      return true;
    } catch {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };

  return {
    fields: data?.fields,
    loading: isLoading,
    mutationLoading,
    error,
    refetch: () => mutate(key),
    schema,
    schemaLoading,
    updateFields,
  };
};
