import useSWR, { mutate as mutateGlobal } from "swr";
import toast from "react-hot-toast";
import { dezerialize } from "zodex";
import { authFetch } from "../util/url";

const fetcher = async (url) => {
  const res = await authFetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(json?.message || "Failed to load template");
    error.status = res.status;
    throw error;
  }
  return json;
};
const fetchSchema = async ([url]) => {
  const res = await authFetch(url, {
    method: "QUERY",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch schema");
  return dezerialize(await res.json());
};
const parseResponse = async (res) => {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || "Request failed");
  return json;
};
const buildKey = ({ eventId, templateId, includeDeleted }) => {
  if (!eventId || !templateId) return null;
  const params = new URLSearchParams();
  if (includeDeleted) params.set("includeDeleted", "true");
  const query = params.toString();
  return `/api/events/${eventId}/templates/${templateId}${query ? `?${query}` : ""}`;
};
const revalidateList = async (eventId) => {
  if (eventId) await mutateGlobal(`/api/events/${eventId}/templates`);
};
export const useEmailTemplate = ({ eventId, templateId, includeDeleted } = {}) => {
  const key = buildKey({ eventId, templateId, includeDeleted });
  const { data, error, isLoading, mutate: refetch } = useSWR(key, fetcher);
  const { data: schema } = useSWR(key ? [key, "schema"] : null, fetchSchema);

  const updateEmailTemplate = async (payload) => {
    if (!key) return false;
    const parsed = schema ? schema.safeParse(payload ?? {}) : { success: true, data: payload };
    if (!parsed.success) {
      toast.error("Validation error");
      return false;
    }
    try {
      await toast.promise(
        authFetch(key, { method: "PUT", body: JSON.stringify(parsed.data) }).then(parseResponse),
        {
          loading: "Updating template…",
          success: "Template updated",
          error: (e) => e?.message || "Error updating template",
        }
      );
      await refetch();
      await revalidateList(eventId);
      return true;
    } catch {
      return false;
    }
  };

  const deleteEmailTemplate = async () => {
    if (!key) return false;
    try {
      await toast.promise(
        authFetch(key, { method: "DELETE" }).then(async (res) => {
          if (res.ok) return true;
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.message || "Error deleting template");
        }),
        {
          loading: "Deleting template…",
          success: "Template deleted",
          error: (e) => e?.message || "Error deleting template",
        }
      );
      await refetch();
      await revalidateList(eventId);
      return true;
    } catch {
      return false;
    }
  };

  return {
    template: data?.template,
    logs: data?.template?.logs || [],
    loading: isLoading,
    error,
    schema,
    refetch,
    updateEmailTemplate,
    deleteEmailTemplate,
  };
};
