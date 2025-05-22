// useLocations.js
import useSWR from "swr";
import { mutate } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useLocations = ({ eventId }) => {
  const {
    data,
    error,
    isLoading,
    mutate: refetchList,
  } = useSWR(`/api/events/${eventId}/locations`, fetcher);

  const createLocation = async (body) => {
    try {
      // fire the request and get back the new location object
      const promise = authFetch(`/api/events/${eventId}/locations`, {
        method: "POST",
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

      // revalidate the list
      refetchList();

      // revalidate the single‐location cache that useLocation will be using
      mutate(
        `/api/events/${eventId}/locations/${newLocation.id}${
          newLocation.includeShifts ? "?includeShifts=true" : ""
        }`
      );

      return true;
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
          body: JSON.stringify(body),
        }
      ).then((r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });
      await toast.promise(promise, {
        loading: "Updating location…",
        success: "Location updated",
        error: "Error updating location",
      });

      // revalidate both list and detail
      refetchList();
      mutate(`/api/events/${eventId}/locations/${locationId}`);

      return true;
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

      refetchList();
      // flush the detail cache
      mutate(`/api/events/${eventId}/locations/${locationId}`, null, false);

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
  };
};
