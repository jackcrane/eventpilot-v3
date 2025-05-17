import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useLocation = ({ eventId, locationId }) => {
  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(`/api/events/${eventId}/locations/${locationId}`, fetcher);

  const deleteLocation = async () => {
    try {
      const promise = authFetch(
        `/api/events/${eventId}/locations/${locationId}`,
        {
          method: "DELETE",
        }
      ).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        console.log(r);
        return true;
      });

      await toast.promise(promise, {
        loading: "Deleting location...",
        success: "Deleted location",
        error: "Error deleting location",
      });

      refetch();
      return true;
    } catch {
      return false;
    }
  };

  return {
    location: data?.location,
    deleteLocation,
    loading: isLoading,
    error,
    refetch,
  };
};
