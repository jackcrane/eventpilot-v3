import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { toast } from "react-hot-toast";
import { publicFetch } from "../util/url";

const fetcher = async (url) => {
  const response = await publicFetch(url);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || "Failed to load unsubscribe details");
  }
  return json;
};

const mutationFetcher = async (url, { arg }) => {
  const response = await publicFetch(url, {
    method: "post",
    body: JSON.stringify({
      personId: arg.personId,
      emailId: arg.emailId,
      mailingListIds: arg.mailingListIds,
      unsubscribeAll: Boolean(arg.unsubscribeAll),
    }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || "Failed to update preferences");
  }
  return json;
};

export const useUnsubscribe = ({ personId, emailId } = {}) => {
  const key = personId && emailId
    ? `/api/unsubscribe?p=${personId}&e=${emailId}`
    : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher);
  const { trigger, isMutating } = useSWRMutation(key, mutationFetcher);

  const updatePreferences = async ({ mailingListIds = [], unsubscribeAll }) => {
    if (!personId || !emailId) return false;

    const payload = {
      personId,
      emailId,
      mailingListIds,
      unsubscribeAll,
    };

    try {
      const response = await toast.promise(trigger(payload), {
        loading: "Updating your preferences...",
        success: "Your preferences have been saved.",
        error: (err) => err?.message || "Failed to update preferences",
      });
      await mutate(response, false);
      return true;
    } catch (err) {
      return false;
    }
  };

  return {
    details: data?.unsubscribe ?? null,
    lastResponse: data ?? null,
    loading: isLoading,
    error,
    refetch: mutate,
    updatePreferences,
    mutationLoading: isMutating,
  };
};
