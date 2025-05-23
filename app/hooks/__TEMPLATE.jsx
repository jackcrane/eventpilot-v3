import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useEmailPreferences = () => {
  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(`/api/auth/me/email`, fetcher);

  const createEmailPreferences = async (data) => {
    try {
      const promise = authFetch(`/api/auth/me/email`, {
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

      refetch();
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
    refetch,
  };
};
