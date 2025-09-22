import useSWR, { mutate as globalMutate } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";

const fetcher = (url) =>
  authFetch(url).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  });

export const useCrmPersons = ({ eventId, page, size, orderBy, order, q, filters } = {}) => {
  const baseKey = `/api/events/${eventId}/crm/person`;
  const params = new URLSearchParams();
  if (page && size) {
    params.set("page", String(page));
    params.set("size", String(size));
  }
  if (orderBy) params.set("orderBy", String(orderBy));
  if (order) params.set("order", String(order));
  if (q && String(q).trim()) params.set("q", String(q).trim());
  if (Array.isArray(filters) && filters.length) params.set("filters", JSON.stringify(filters));
  const qs = params.toString();
  const key = qs ? `${baseKey}?${qs}` : baseKey;
  const { data, error, isLoading, isValidating, mutate } = useSWR(key, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });
  const [mutationLoading, setMutationLoading] = useState(false);

  // state for trimmed imports
  const [imports, setImports] = useState([]);

  let fetchImports;
  useEffect(() => {
    let timerId;

    fetchImports = async () => {
      try {
        const res = await authFetch(baseKey, { method: "PATCH" });
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
          if (json.imports.length > 0) mutate();

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
      const promise = authFetch(baseKey, {
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

      // Revalidate current page and any cached pages for this list
      await mutate();
      await globalMutate((k) => typeof k === "string" && k.startsWith(baseKey));
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
      const promise = authFetch(baseKey, {
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

      await mutate();
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
    total: data?.total ?? (Array.isArray(data?.crmPersons) ? data.crmPersons.length : 0),
    imports,
    loading: isLoading,
    validating: isValidating,
    mutationLoading,
    error,
    refetch: () => mutate(),
    createCrmPerson,
    batchCreateCrmPersons,
  };
};
