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

export const MAILING_LIST_MEMBER_STATUSES = [
  "ACTIVE",
  "UNSUBSCRIBED",
  "INACTIVE",
  "DELETED",
];

export const useMailingListMembers = ({ eventId, mailingListId } = {}) => {
  const key =
    eventId && mailingListId
      ? `/api/events/${eventId}/mailing-lists/${mailingListId}`
      : null;
  const memberKey = key ? `${key}/member` : null;
  const bulkKey =
    eventId && mailingListId
      ? `/api/events/${eventId}/mailing-lists/${mailingListId}/members`
      : null;
  const membersKey = bulkKey;
  const listCollectionKey = eventId
    ? `/api/events/${eventId}/mailing-lists`
    : null;

  const {
    data,
    error,
    isLoading,
    mutate: mutateSummary,
  } = useSWR(key, fetcher);
  const {
    data: membersData,
    error: membersError,
    isLoading: membersLoading,
    mutate: mutateMembers,
  } = useSWR(membersKey, fetcher);
  const { data: memberSchemaRaw } = useSWR(
    memberKey ? [memberKey, "schema"] : null,
    fetchSchema
  );
  const { data: bulkSchema } = useSWR(
    bulkKey ? [bulkKey, "schema"] : null,
    fetchSchema
  );

  const memberSchemas = memberSchemaRaw?.shape
    ? {
        create: memberSchemaRaw.shape.create,
        update: memberSchemaRaw.shape.update,
        delete: memberSchemaRaw.shape.delete,
      }
    : null;

  const wrapMutation = async (promiseFactory, messages) => {
    try {
      const result = await toast.promise(promiseFactory(), {
        loading: messages.loading,
        success: messages.success,
        error: (e) => e?.message || messages.error,
      });
      await Promise.all([
        mutateSummary?.(),
        mutateMembers?.(),
      ]);
      if (listCollectionKey) await mutate(listCollectionKey);
      return result;
    } catch (e) {
      return null;
    }
  };

  const addMember = async (payload) => {
    if (!memberKey) return false;

    const schema = memberSchemas?.create;
    const parsed = schema
      ? schema.safeParse(payload ?? {})
      : { success: true, data: payload };
    if (!parsed?.success) {
      toast.error("Validation error");
      return false;
    }

    const result = await wrapMutation(
      () =>
        authFetch(memberKey, {
          method: "POST",
          body: JSON.stringify(parsed.data),
        }).then(parseResponse),
      {
        loading: "Adding to mailing list…",
        success: "Member added",
        error: "Error adding member",
      }
    );

    return Boolean(result);
  };

  const updateMemberStatus = async (payload) => {
    if (!memberKey) return false;

    const schema = memberSchemas?.update;
    const parsed = schema
      ? schema.safeParse(payload ?? {})
      : { success: true, data: payload };
    if (!parsed?.success) {
      toast.error("Validation error");
      return false;
    }

    const result = await wrapMutation(
      () =>
        authFetch(memberKey, {
          method: "PUT",
          body: JSON.stringify(parsed.data),
        }).then(parseResponse),
      {
        loading: "Updating member…",
        success: "Member updated",
        error: "Error updating member",
      }
    );

    return Boolean(result);
  };

  const removeMember = async (payload) => {
    if (!memberKey) return false;

    const schema = memberSchemas?.delete;
    const parsed = schema
      ? schema.safeParse(payload ?? {})
      : { success: true, data: payload };
    if (!parsed?.success) {
      toast.error("Validation error");
      return false;
    }

    const result = await wrapMutation(
      () =>
        authFetch(memberKey, {
          method: "DELETE",
          body: JSON.stringify(parsed.data),
        }).then(async (res) => {
          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json?.message || "Error removing member");
          }
          return true;
        }),
      {
        loading: "Removing member…",
        success: "Member removed",
        error: "Error removing member",
      }
    );

    return Boolean(result);
  };

  const addMembers = async (payload) => {
    if (!bulkKey) return null;

    const schema = bulkSchema;
    const parsed = schema
      ? schema.safeParse(payload ?? {})
      : { success: true, data: payload };
    if (!parsed?.success) {
      toast.error("Validation error");
      return null;
    }

    const result = await wrapMutation(
      () =>
        authFetch(bulkKey, {
          method: "POST",
          body: JSON.stringify(parsed.data),
        }).then(parseResponse),
      {
        loading: "Adding people…",
        success: "People added",
        error: "Error adding people",
      }
    );

    return result;
  };

  const refetch = async () => {
    await Promise.all([
      mutateSummary?.(),
      mutateMembers?.(),
    ]);
  };

  return {
    members: membersData?.members || [],
    memberCount: data?.mailingList?.memberCount ?? membersData?.members?.length ?? 0,
    mailingList: data?.mailingList,
    loading: isLoading || membersLoading,
    error: error || membersError,
    refetch,
    memberSchemas,
    bulkSchema,
    addMember,
    updateMemberStatus,
    removeMember,
    addMembers,
  };
};
