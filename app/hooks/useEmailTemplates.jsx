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

export const useEmailTemplates = ({ eventId, includeDeleted } = {}) => {
  let key = null;
  const { mutate: boundMutate } = useSWRConfig();

  if (eventId) {
    const params = new URLSearchParams();
    if (includeDeleted) {
      params.set("includeDeleted", "true");
    }
    const query = params.toString();
    key = `/api/events/${eventId}/templates${query ? `?${query}` : ""}`;
  }

  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(key, fetcher);

  const { data: schema } = useSWR(key ? [key, "schema"] : null, fetchSchema);

  const createEmailTemplate = async (payload) => {
    if (!eventId) return null;
    const templateUrl = `/api/events/${eventId}/templates`;

    try {
      const parsed = schema
        ? schema.safeParse(payload ?? {})
        : { success: true, data: payload };
      if (!parsed.success) {
        toast.error("Validation error");
        return null;
      }

      const promise = authFetch(templateUrl, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      }).then(parseResponse);

      const { template } = await toast.promise(promise, {
        loading: "Creating template…",
        success: "Template created",
        error: (e) => e?.message || "Error creating template",
      });

      await refetch();
      if (template?.id) {
        await boundMutate(`/api/events/${eventId}/templates/${template.id}`);
      }

      return template ?? null;
    } catch (e) {
      return null;
    }
  };

  const updateEmailTemplate = async (templateId, payload) => {
    if (!eventId || !templateId) return false;
    const templateUrl = `/api/events/${eventId}/templates/${templateId}`;

    try {
      const parsed = schema
        ? schema.safeParse(payload ?? {})
        : { success: true, data: payload };
      if (!parsed.success) {
        toast.error("Validation error");
        return false;
      }

      const promise = authFetch(templateUrl, {
        method: "PUT",
        body: JSON.stringify(parsed.data),
      }).then(parseResponse);

      await toast.promise(promise, {
        loading: "Updating template…",
        success: "Template updated",
        error: (e) => e?.message || "Error updating template",
      });

      await refetch();
      await boundMutate(templateUrl);

      return true;
    } catch (e) {
      return false;
    }
  };

  const deleteEmailTemplate = async (templateId) => {
    if (!eventId || !templateId) return false;
    const templateUrl = `/api/events/${eventId}/templates/${templateId}`;

    try {
      const promise = authFetch(templateUrl, {
        method: "DELETE",
      }).then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.message || "Error deleting template");
        }
        return true;
      });

      await toast.promise(promise, {
        loading: "Deleting template…",
        success: "Template deleted",
        error: (e) => e?.message || "Error deleting template",
      });

      await refetch();
      await boundMutate(templateUrl);

      return true;
    } catch (e) {
      return false;
    }
  };

  return {
    templates: data?.templates || [],
    schema,
    loading: isLoading,
    error,
    refetch,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
  };
};
