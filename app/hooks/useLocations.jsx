// useLocations.js
import useSWR, { useSWRConfig } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";

const fetcher = (url) => authFetch(url).then((r) => r.json());

const locationsListKey = (eventId) => `/api/events/${eventId}/locations`;
const locationDetailKey = (eventId, locationId, includeShifts = false) =>
  `/api/events/${eventId}/locations/${locationId}${
    includeShifts ? "?includeShifts=true" : ""
  }`;
const locationNamespace = (eventId) => `/api/events/${eventId}/locations`;

// ✅ Revalidate everything under /locations (including the list and details)
//    Uses BOUND mutate (same cache as useSWR)
const revalidateLocations = async (eventId, boundMutate) => {
  await boundMutate((key) => {
    // Optional debug: list current key being checked
    // console.log("revalidateLocations checking:", key);
    if (typeof key !== "string") return false;
    // startsWith handles BOTH the list key and any subpaths/queries
    return key.startsWith(locationNamespace(eventId));
  });
};

export const useLocations = ({ eventId }) => {
  const { mutate: boundMutate, cache } = useSWRConfig(); // <-- key change
  const {
    data,
    error,
    isLoading,
    mutate: refetchList,
  } = useSWR(locationsListKey(eventId), fetcher);

  // Optional: see which keys exist in THIS cache
  // for (const k of cache.keys()) console.log("SWR cache key:", k);

  const createLocation = async (body) => {
    try {
      const promise = authFetch(`/api/events/${eventId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      const newLocation = await toast.promise(promise, {
        loading: "Creating location…",
        success: "Location created",
        error: "Error creating location",
      });

      await revalidateLocations(eventId, boundMutate);
      return newLocation;
    } catch {
      return false;
    }
  };

  const editLocation = async (locationId, body) => {
    try {
      const promise = authFetch(
        `/api/events/${eventId}/locations/${locationId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      ).then((r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      const { location: updatedLocation } = await toast.promise(promise, {
        loading: "Updating location…",
        success: "Location updated",
        error: "Error updating location",
      });

      await revalidateLocations(eventId, boundMutate);
      return updatedLocation ?? true;
    } catch {
      return false;
    }
  };

  const deleteLocation = async (locationId) => {
    try {
      const promise = authFetch(
        `/api/events/${eventId}/locations/${locationId}`,
        { method: "DELETE" }
      ).then((r) => {
        if (!r.ok) throw new Error("Request failed");
        return true;
      });

      await toast.promise(promise, {
        loading: "Deleting location…",
        success: "Deleted",
        error: "Error deleting",
      });

      await revalidateLocations(eventId, boundMutate);
      return true;
    } catch {
      return false;
    }
  };

  return {
    locations: data?.locations,
    createLocation,
    editLocation,
    deleteLocation,
    loading: isLoading,
    error,
    refetch: refetchList,
    locationsListKey,
    locationDetailKey,
  };
};
