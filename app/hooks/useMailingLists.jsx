import useSWR, { mutate } from "swr";
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

export const useMailingLists = ({ eventId, includeDeleted } = {}) => {
  const key = eventId
    ? `/api/events/${eventId}/mailing-lists${includeDeleted ? "?includeDeleted=true" : ""}`
    : null;

  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(key, fetcher);
  const { data: schema } = useSWR(key ? [key, "schema"] : null, fetchSchema);

  const createMailingList = async (payload) => {
    if (!eventId) return false;
    const listUrl = `/api/events/${eventId}/mailing-lists`;

    try {
      const parsed = schema
        ? schema.safeParse(payload ?? {})
        : { success: true, data: payload };
      if (!parsed.success) {
        toast.error("Validation error");
        return false;
      }

      const promise = authFetch(listUrl, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      }).then(parseResponse);

      const { mailingList } = await toast.promise(promise, {
        loading: "Creating mailing list…",
        success: "Mailing list created",
        error: (e) => e?.message || "Error creating mailing list",
      });

      await refetch();
      if (mailingList?.id) {
        await mutate(`/api/events/${eventId}/mailing-lists/${mailingList.id}`);
      }

      return true;
    } catch (e) {
      return false;
    }
  };

  const updateMailingList = async (mailingListId, payload) => {
    if (!eventId || !mailingListId) return false;
    const listUrl = `/api/events/${eventId}/mailing-lists/${mailingListId}`;

    try {
      const parsed = schema
        ? schema.safeParse(payload ?? {})
        : { success: true, data: payload };
      if (!parsed.success) {
        toast.error("Validation error");
        return false;
      }

      const promise = authFetch(listUrl, {
        method: "PUT",
        body: JSON.stringify(parsed.data),
      }).then(parseResponse);

      await toast.promise(promise, {
        loading: "Updating mailing list…",
        success: "Mailing list updated",
        error: (e) => e?.message || "Error updating mailing list",
      });

      await refetch();
      await mutate(listUrl);

      return true;
    } catch (e) {
      return false;
    }
  };

  const deleteMailingList = async (mailingListId) => {
    if (!eventId || !mailingListId) return false;
    const listUrl = `/api/events/${eventId}/mailing-lists/${mailingListId}`;

    try {
      const promise = authFetch(listUrl, { method: "DELETE" }).then(async (res) => {
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

      await refetch();
      await mutate(listUrl);

      return true;
    } catch (e) {
      return false;
    }
  };

  return {
    mailingLists: data?.mailingLists || [],
    schema,
    loading: isLoading,
    error,
    refetch,
    createMailingList,
    updateMailingList,
    deleteMailingList,
  };
};
