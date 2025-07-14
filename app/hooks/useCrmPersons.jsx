import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";

const fetcher = (url) =>
  authFetch(url).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  });

export const useCrmPersons = ({ eventId }) => {
  const key = `/api/events/${eventId}/crm/person`;
  const { data, error, isLoading, mutate } = useSWR(key, fetcher);
  const [mutationLoading, setMutationLoading] = useState(false);

  // state for trimmed imports
  const [imports, setImports] = useState([]);

  let fetchImports;
  useEffect(() => {
    let timerId;

    fetchImports = async () => {
      try {
        const res = await authFetch(key, { method: "PATCH" });
        if (res.ok) {
          const json = await res.json();
          // map to only the fields you need
          setImports(
            json.imports.map((job) => ({
              total: job.total,
              completed: job._count.crmPersons,
              createdAt: job.createdAt,
            }))
          );
          if (json.imports.length > 0) {
            mutate();
          }

          // decide next interval
          const running = json.imports.some((job) => !job.finished);
          timerId = setTimeout(fetchImports, running ? 5000 : 30000);
        } else {
          // on error, retry in 30s
          timerId = setTimeout(fetchImports, 30000);
        }
      } catch {
        timerId = setTimeout(fetchImports, 30000);
      }
    };

    fetchImports();
    return () => clearTimeout(timerId);
  }, [eventId]);

  const createCrmPerson = async (payload) => {
    setMutationLoading(true);
    try {
      const promise = authFetch(key, {
        method: "POST",
        body: JSON.stringify(payload),
      }).then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Creating...",
        success: "Created successfully",
        error: "Error creating",
      });

      await mutate(key);
      return true;
    } catch {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };

  const batchCreateCrmPersons = async (payload) => {
    setMutationLoading(true);
    try {
      const promise = authFetch(key, {
        method: "POST",
        body: JSON.stringify(payload),
      }).then((r) => {
        if (!r.ok) {
          // throw new Error(r.statusText);
          toast.error("Something went wrong scheduling the import.");
          return false;
        }
        return r.json();
      });

      toast.success(
        "Import successfully scheduled. It may take a few minutes to complete."
      );

      await mutate(key);
      fetchImports();
      setTimeout(fetchImports, 1000);
      return true;
    } catch {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };

  return {
    crmPersons: data?.crmPersons,
    imports,
    loading: isLoading,
    mutationLoading,
    error,
    refetch: () => mutate(key),
    createCrmPerson,
    batchCreateCrmPersons,
  };
};
