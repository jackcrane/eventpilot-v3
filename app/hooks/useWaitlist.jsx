import useSWR from "swr";
import toast from "react-hot-toast";
import { publicFetch } from "../util/url";
import { dezerialize } from "zodex";

const fetchSchema = async () => {
  const res = await publicFetch("/api/waitlist", {
    method: "QUERY",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch schema");
  const raw = await res.json();
  return dezerialize(raw);
};

export const useWaitlist = () => {
  // Expose schema for clients that want to dynamically render/validate
  const { data: schema, isLoading: schemaLoading, error: schemaError } =
    useSWR(["/api/waitlist", "schema"], fetchSchema);

  const joinWaitlist = async (payload) => {
    try {
      const promise = publicFetch(`/api/waitlist`, {
        method: "POST",
        body: JSON.stringify(payload),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Submitting...",
        success: "Thanks! You're on the list.",
        error: "Could not submit. Please try again.",
      });

      return true;
    } catch (e) {
      return false;
    }
  };

  return {
    schema,
    schemaLoading,
    schemaError,
    joinWaitlist,
  };
};
