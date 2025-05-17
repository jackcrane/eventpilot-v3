import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useLocations = ({ eventId }) => {
  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(`/api/events/${eventId}/locations`, fetcher);

  const createLocation = async (data) => {
    try {
      const promise = authFetch(`/api/events/${eventId}/locations`, {
        method: "POST",
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Creating location...",
        success: "Location created successfully",
        error: "Error creating location",
      });

      refetch();
      return true;
    } catch {
      return false;
    }
  };

  const editLocation = async (locationId, data) => {
    try {
      const promise = authFetch(
        `/api/events/${eventId}/locations/${locationId}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        }
      ).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Updating location...",
        success: "Updated location",
        error: "Error updating location",
      });

      refetch();
      return true;
    } catch {
      return false;
    }
  };

  return {
    locations: data?.locations,
    editLocation,
    createLocation,
    loading: isLoading,
    error,
    refetch,
  };
};
