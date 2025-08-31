import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import { useState } from "react";
import toast from "react-hot-toast";
import { useConfirm } from "tabler-react-2";
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

export const useRegistrationTeam = ({ eventId, teamId }) => {
  const key = `/api/events/${eventId}/registration/team/${teamId}`;
  const listKey = `/api/events/${eventId}/registration/team`;

  const { data, error, isLoading } = useSWR(key, fetcher);
  const { data: schema, loading: schemaLoading } = useSWR(
    [key, "schema"],
    fetchSchema
  );
  const [mutationLoading, setMutationLoading] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const { confirm, ConfirmModal } = useConfirm({
    title: "Delete this team?",
    text: "This action cannot be undone.",
  });

  const updateTeam = async (_data) => {
    setMutationLoading(true);
    try {
      const parsed = schema.safeParse(_data);
      if (!parsed.success) {
        toast.error("Error updating team");
        setValidationError(parsed.error.format());
        return false;
      }
      const promise = authFetch(key, {
        method: "PUT",
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
        loading: "Updating...",
        success: "Updated successfully",
        error: "Error",
      });

      await mutate(key);
      await mutate(listKey);
      return true;
    } catch (e) {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };

  const deleteTeam = async (onDelete) => {
    if (await confirm()) {
      setMutationLoading(true);
      try {
        const promise = authFetch(key, { method: "DELETE" }).then(async (r) => {
          const j = await r.json();
          if (!r.ok) throw new Error(j?.message || "Request failed");
          return j;
        });

        await toast.promise(promise, {
          loading: "Deleting...",
          success: "Deleted successfully",
          error: (e) => e?.message || "Error deleting",
        });

        await mutate(key);
        await mutate(listKey);
        onDelete?.();
        return true;
      } catch (e) {
        return false;
      } finally {
        setMutationLoading(false);
      }
    }
  };

  return {
    team: data?.team,
    loading: isLoading,
    mutationLoading,
    error,
    refetch: () => mutate(key),
    schema,
    schemaLoading,
    validationError,
    updateTeam,
    deleteTeam,
    DeleteConfirmElement: ConfirmModal,
  };
};
