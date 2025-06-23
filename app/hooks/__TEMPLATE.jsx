import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useEmailPreferences = () => {
  const key = `/api/auth/me/email`;

  const { data, error, isLoading } = useSWR(key, fetcher);

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
    loading: isLoading,
    error,
    refetch: () => mutate(key),
  };
};
