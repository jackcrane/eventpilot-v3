import useSWR, { useSWRConfig } from "swr";
import toast from "react-hot-toast";
import { dezerialize } from "zodex";
import { authFetch } from "../util/url";

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

const parseResponse = async (res) => {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || "Request failed");
  }
  return json;
};

export const useMailingList = ({ eventId, mailingListId } = {}) => {
  const { mutate: boundMutate } = useSWRConfig();
  const key =
    eventId && mailingListId
      ? `/api/events/${eventId}/mailing-lists/${mailingListId}`
      : null;
  const listCollectionKey = eventId
    ? `/api/events/${eventId}/mailing-lists`
    : null;

  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(key, fetcher);
  const { data: listSchema } = useSWR(key ? [key, "schema"] : null, fetchSchema);

  const updateMailingList = async (payload) => {
    if (!key) return false;

    const parsed = listSchema
      ? listSchema.safeParse(payload ?? {})
      : { success: true, data: payload };
    if (!parsed.success) {
      toast.error("Validation error");
      return false;
    }

    try {
      const promise = authFetch(key, {
        method: "PUT",
        body: JSON.stringify(parsed.data),
      }).then(parseResponse);

      await toast.promise(promise, {
        loading: "Updating mailing list…",
        success: "Mailing list updated",
        error: (e) => e?.message || "Error updating mailing list",
      });

      await refetch();
      if (listCollectionKey) await boundMutate(listCollectionKey);
      return true;
    } catch (e) {
      return false;
    }
  };

  const setSavedSegment = async (savedSegmentId) => {
    if (!key) return false;
    const currentTitle = data?.mailingList?.title;
    if (!currentTitle) {
      toast.error("Mailing list not ready");
      return false;
    }

    return updateMailingList({
      title: currentTitle,
      crmSavedSegmentId: savedSegmentId ?? null,
    });
  };

  const deleteMailingList = async () => {
    if (!key) return false;

    try {
      const promise = authFetch(key, { method: "DELETE" }).then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.message || "Error deleting mailing list");
        }
        return true;
      });

      await toast.promise(promise, {
        loading: "Deleting mailing list…",
        success: "Mailing list deleted",
        error: (e) => e?.message || "Error deleting mailing list",
      });

      if (listCollectionKey) await boundMutate(listCollectionKey);
      if (key) await boundMutate(key, null, false);
      return true;
    } catch (e) {
      return false;
    }
  };

  return {
    mailingList: data?.mailingList,
    memberCount: data?.mailingList?.memberCount ?? 0,
    logs: data?.mailingList?.logs || [],
    loading: isLoading,
    error,
    refetch,
    schema: listSchema,
    updateMailingList,
    setSavedSegment,
    deleteMailingList,
  };
};
