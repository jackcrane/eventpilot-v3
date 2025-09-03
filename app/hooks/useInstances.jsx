import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import { useState } from "react";
import toast from "react-hot-toast";
import { dezerialize } from "zodex";
import React from "react";
import { useOffcanvas, useConfirm } from "tabler-react-2";
import { InstanceCRUD } from "../components/InstanceCRUD/InstanceCRUD";
import { useSelectedInstance } from "../contexts/SelectedInstanceContext";

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

export const useInstances = ({ eventId }) => {
  const key = `/api/events/${eventId}/instances`;
  const { data, error, isLoading } = useSWR(key, fetcher);
  const { data: schema, loading: schemaLoading } = useSWR(
    [key, "schema"],
    fetchSchema
  );
  const [mutationLoading, setMutationLoading] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const { instanceDropdownValue, setInstance } = useSelectedInstance();
  const { confirm, ConfirmModal } = useConfirm({
    title: "Are you sure you want to delete this instance?",
    text: "This action cannot be undone.",
  });

  const createInstance = async (_data, setGlobalInstance = true) => {
    setMutationLoading(true);
    try {
      const parsed = schema.safeParse(_data);
      let data;
      if (!parsed.success) {
        toast.error("Error");
        setValidationError(parsed.error.format());
        console.log(parsed.error.format());
        return false;
      } else {
        data = parsed.data;
      }
      const promise = authFetch(key, {
        method: "POST",
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      const result = await toast.promise(promise, {
        loading: "Creating...",
        success: "Created successfully",
        error: "Error",
      });

      if (result.instance?.id && setGlobalInstance) {
        setInstance(result.instance.id);
        toast.success("A new instance has been created & selected");
      }

      await mutate(key);
      // Invalidate all event-scoped keys to refresh dependent data
      await mutate(
        (k) => typeof k === "string" && k.includes(`/api/events/${eventId}`),
        undefined,
        { revalidate: true }
      );
      return true;
    } catch {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };

  const deleteInstanceById = async (instanceId) => {
    if (!(await confirm())) return false;
    setMutationLoading(true);
    try {
      // Compute next candidate if deleting currently selected
      const deletingCurrent = instanceId === instanceDropdownValue?.id;
      let nextCandidate = null;
      if (deletingCurrent) {
        const now = new Date();
        const list = data?.instances ?? [];
        const remaining = list.filter((x) => x.id !== instanceId);
        const nextFlagged = remaining.find((x) => x.isNext);
        const future = remaining
          .filter(
            (x) =>
              x?.startTime && new Date(x.startTime).getTime() >= now.getTime()
          )
          .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        const past = remaining
          .filter(
            (x) => x?.endTime && new Date(x.endTime).getTime() < now.getTime()
          )
          .sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
        const fallbackPastByStart = remaining
          .filter(
            (x) =>
              x?.startTime && new Date(x.startTime).getTime() < now.getTime()
          )
          .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        nextCandidate =
          nextFlagged ||
          future?.[0] ||
          past?.[0] ||
          fallbackPastByStart?.[0] ||
          remaining?.[0] ||
          null;
      }

      const promise = authFetch(
        `/api/events/${eventId}/instances/${instanceId}`,
        {
          method: "DELETE",
        }
      ).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Deleting...",
        success: "Deleted successfully",
        error: "Error deleting",
      });

      await mutate(key);
      // Also refresh all event-scoped keys across the app
      await mutate(
        (k) => typeof k === "string" && k.includes(`/api/events/${eventId}`),
        undefined,
        { revalidate: true }
      );
      if (nextCandidate) setInstance(nextCandidate.id);
      return true;
    } catch (e) {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };

  const {
    offcanvas: createInstanceInteraction,
    OffcanvasElement: CreateInstanceElement,
  } = useOffcanvas({
    offcanvasProps: { position: "end", size: 470, zIndex: 1051 },
    content: <InstanceCRUD eventId={eventId} mode="create" />,
  });

  return {
    instances: data?.instances,
    loading: isLoading,
    mutationLoading,
    error,
    refetch: () => mutate(key),
    schema,
    schemaLoading,
    validationError,
    createInstance,
    deleteInstanceById,
    createInstanceInteraction,
    CreateInstanceElement,
    DeleteConfirmElement: ConfirmModal,
  };
};
