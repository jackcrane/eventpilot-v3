import useSWR, { useSWRConfig } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";
import { dezerialize } from "zodex";
import z from "zod";
import { capturePosthogEvent } from "../util/posthog";

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

export const useRegistrationBuilder = ({ eventId }) => {
  const key = `/api/events/${eventId}/registration/builder`;
  const { mutate } = useSWRConfig();

  const { data, error, isLoading } = useSWR(key, fetcher);
  const { data: schema, loading: schemaLoading } = useSWR(
    [key, "schema"],
    fetchSchema
  );

  const validateOnly = (data) => {
    try {
      const parsed = schema.safeParse(data);
      if (!parsed.success) {
        return { success: false, errors: parsed.error.format() };
      }
      return true;
    } catch {
      return false;
    }
  };

  const saveRegistration = async (data) => {
    try {
      const parsed = schema.safeParse(data);
      if (!parsed.success) {
        toast.error("Error saving registration");
        console.log(parsed.error);
        return { success: false, errors: parsed.error.format() };
      }
      const promise = authFetch(key, {
        method: "PUT",
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Saving...",
        success: "Saved successfully",
        error: "Error",
      });

      capturePosthogEvent("ui_registration_builder_saved", {
        event_id: eventId,
        tier_count: data?.tiers?.length || 0,
        period_count: data?.periods?.length || 0,
      });

      await mutate(key); // Invalidate and refetch
      return true;
    } catch {
      return false;
    }
  };

  return {
    tiers: data?.tiers,
    periods: data?.periods,
    saveRegistration,
    schema,
    validateOnly,
    schemaLoading,
    loading: isLoading,
    error,
    refetch: () => mutate(key),
  };
};
