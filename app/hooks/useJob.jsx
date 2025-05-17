import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useJob = ({ eventId, locationId, jobId }) => {
  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(
    `/api/events/${eventId}/locations/${locationId}/jobs/${jobId}`,
    fetcher
  );

  const deleteJob = async () => {
    try {
      const promise = authFetch(
        `/api/events/${eventId}/locations/${locationId}/jobs/${jobId}`,
        {
          method: "DELETE",
        }
      ).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Deleting job...",
        success: "Deleted job",
      });

      refetch();
      return true;
    } catch {
      return false;
    }
  };

  return {
    job: data?.job,
    deleteJob,
    loading: isLoading,
    error,
    refetch,
  };
};
