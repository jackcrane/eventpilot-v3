import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
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

export const useEmailPreferences = () => {
  const key = `/api/auth/me/email`;

  const { data, error, isLoading } = useSWR(key, fetcher);
  const { data: schema, loading: schemaLoading } = useSWR(
    [key, "schema"],
    fetchSchema
  );

  const createEmailPreferences = async (data) => {
    try {
      const promise = authFetch(key, {
        method: "POST",
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Creating...",
        success: "Created successfully",
        error: "Error",
      });

      await mutate(key); // Invalidate and refetch
      return true;
    } catch {
      return false;
    }
  };

  return {
    emailPreferences: data?.emailPreferences,
    createEmailPreferences,
    schema,
    schemaLoading,
    loading: isLoading,
    error,
    refetch: () => mutate(key),
  };
};
