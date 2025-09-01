import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import { useState } from "react";
import toast from "react-hot-toast";
import { dezerialize } from "zodex";
import React from "react";
import { useOffcanvas } from "tabler-react-2";
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
  const { setInstance } = useSelectedInstance();

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
      return true;
    } catch {
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
    createInstanceInteraction,
    CreateInstanceElement,
  };
};
