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

export const useRegistrationTeams = ({ eventId }) => {
  const key = `/api/events/${eventId}/registration/team`;

  const { data, error, isLoading } = useSWR(key, fetcher);
  const { data: schema, loading: schemaLoading } = useSWR(
    [key, "schema"],
    fetchSchema
  );
  const [mutationLoading, setMutationLoading] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const createTeam = async (_data) => {
    setMutationLoading(true);
    try {
      const parsed = schema.safeParse(_data);
      if (!parsed.success) {
        toast.error("Error creating team");
        setValidationError(parsed.error.format());
        return false;
      }

      const promise = authFetch(key, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      }).then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          if (r.status === 400 && j?.message) setValidationError(j.message);
          throw new Error("Request failed");
        }
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Creating...",
        success: "Created successfully",
        error: "Error",
      });

      await mutate(key);
      return true;
    } catch (e) {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };

  return {
    teams: data?.teams,
    loading: isLoading,
    validationError,
    mutationLoading,
    error,
    refetch: () => mutate(key),
    schema,
    schemaLoading,
    createTeam,
  };
};
