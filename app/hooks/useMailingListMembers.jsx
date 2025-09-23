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

export const useMailingListMembers = (
  {
    eventId,
    mailingListId,
    page,
    pageSize,
    includeDeletedMembers,
  } = {}
) => {
  const key =
    eventId && mailingListId
      ? `/api/events/${eventId}/mailing-lists/${mailingListId}`
      : null;
  const memberKey = key ? `${key}/member` : null;
  const bulkKey =
    eventId && mailingListId
      ? `/api/events/${eventId}/mailing-lists/${mailingListId}/members`
      : null;

  const membersKey = (() => {
    if (!bulkKey) return null;
    const params = new URLSearchParams();
    if (includeDeletedMembers) {
      params.set("includeDeletedMembers", "true");
    }
    if (Number.isFinite(page) && page > 0) {
      params.set("page", String(page));
    }
    if (Number.isFinite(pageSize) && pageSize > 0) {
      params.set("size", String(pageSize));
    }
    const query = params.toString();
    return query ? `${bulkKey}?${query}` : bulkKey;
  })();
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

  const wrapMutation = async (promiseFactory, messages, options = {}) => {
    const { disableToast = false, ...mutationOptions } = options || {};

    const runMutation = async () => {
      const result = await promiseFactory();
      await Promise.all([
        mutateSummary?.(),
        mutateMembers?.(),
      ]);
      if (listCollectionKey) await mutate(listCollectionKey);
      return result;
    };

    if (disableToast) {
      return runMutation();
    }

    try {
      return await toast.promise(runMutation(), {
        loading: messages.loading,
        success: messages.success,
        error: (e) => e?.message || messages.error,
      });
    } catch (e) {
      return null;
    }
  };

  const addMember = async (payload, options) => {
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
      },
      options
    );

    return Boolean(result);
  };

  const updateMemberStatus = async (payload, options) => {
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
      },
      options
    );

    return Boolean(result);
  };

  const removeMember = async (payload, options) => {
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
      },
      options
    );

    return Boolean(result);
  };

  const addMembers = async (payload, options = {}) => {
    if (!bulkKey) return null;

    const schema = bulkSchema;
    const parsed = schema
      ? schema.safeParse(payload ?? {})
      : { success: true, data: payload };
    if (!parsed?.success) {
      toast.error("Validation error");
      return null;
    }

    const { disableToast = false, ...mutationOptions } = options || {};

    const runMutation = () =>
      authFetch(bulkKey, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      }).then(parseResponse);

    const mutationPromise = wrapMutation(
      runMutation,
      {
        loading: "Adding people…",
        success: "People added",
        error: "Error adding people",
      },
      { ...mutationOptions, disableToast: true }
    );

    const showUnsubscribedToasts = (result) => {
      if (!result) return;

      const unsubscribedIds = Array.isArray(result?.skipped?.unsubscribed)
        ? result.skipped.unsubscribed
        : [];

      if (!unsubscribedIds.length) {
        return;
      }

      const detailEntries = Array.isArray(
        result?.skippedDetails?.unsubscribed
      )
        ? result.skippedDetails.unsubscribed
        : [];

      const detailsById = new Map(
        detailEntries.map((entry) => [entry.crmPersonId, entry])
      );

      for (const id of unsubscribedIds) {
        const detail = detailsById.get(id);
        const name = detail?.name?.trim();
        const displayName = name && name.length ? name : "This contact";
        toast.error(
          `${displayName} was not added because they have unsubscribed from this list`
        );
      }
    };

    if (disableToast) {
      const result = await mutationPromise;
      showUnsubscribedToasts(result);
      return result;
    }

    let loadingToastId = toast.loading("Adding people…");
    try {
      const result = await mutationPromise;
      toast.dismiss(loadingToastId);
      loadingToastId = null;

      const successCount =
        Number(result?.created ?? 0) +
        Number(result?.reactivated ?? 0) +
        Number(result?.updated ?? 0);

      if (successCount > 0) {
        toast.success("People added");
      } else {
        toast.error("No members were added");
      }

      showUnsubscribedToasts(result);

      return result;
    } catch (error) {
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
        loadingToastId = null;
      }
      const message = error?.message || "Error adding people";
      toast.error(message);
      return null;
    }
  };

  const refetch = async () => {
    await Promise.all([
      mutateSummary?.(),
      mutateMembers?.(),
    ]);
  };

  return {
    members: membersData?.members || [],
    memberCount:
      data?.mailingList?.memberCount ?? membersData?.total ?? 0,
    totalMembers: membersData?.total ?? 0,
    page: membersData?.page ?? (Number.isFinite(page) ? page : 1),
    size: membersData?.size ?? (Number.isFinite(pageSize) ? pageSize : 25),
    totalPages: membersData?.totalPages ?? null,
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
