import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";
import { useState } from "react";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useEmailPreferences = () => {
  const [mutationLoading, setMutationLoading] = useState(false);

  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(`/api/auth/me/email`, fetcher);

  const updateEmailPreferences = async (data) => {
    setMutationLoading(true);
    try {
      mutate(`/api/auth/me/email`, { ...data }, false); // Optimistic update
      const r = await authFetch(`/api/auth/me/email`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      const { emailPreferences } = await r.json();
      if (emailPreferences) {
        mutate(`/api/auth/me/email`, emailPreferences, true);
        toast.success("Email preferences updated!");
      } else {
        throw new Error("Failed to update email preferences");
      }
    } catch (error) {
      console.error("Update failed", error);
      toast.error("Failed to update email preferences.");
      throw error;
    } finally {
      setMutationLoading(false);
    }
  };

  return {
    emailPreferences: data?.emailPreferences,
    loading: isLoading,
    mutationLoading,
    error,
    refetch,
    updateEmailPreferences,
  };
};
