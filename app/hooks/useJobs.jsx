import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";
import { useEffect } from "react";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useJobs = ({ eventId, locationId }) => {
  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(`/api/events/${eventId}/locations/${locationId}/jobs`, fetcher);

  useEffect(() => {
    console.log("Data Changed", data);
  }, [data]);

  const createJob = async (data) => {
    try {
      const promise = authFetch(
        `/api/events/${eventId}/locations/${locationId}/jobs`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      ).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });

      await toast.promise(promise, {
        loading: "Creating job...",
        success: "Job created successfully",
        error: "Error creating job",
      });

      refetch();
      return true;
    } catch (e) {
      console.log("Error creating job", e);
      return false;
    }
  };

  const deleteJob = async (jobId) => {
    try {
      const promise = authFetch(
        `/api/events/${eventId}/locations/${locationId}/jobs/${jobId}`,
        {
          method: "DELETE",
        }
      ).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return true;
      });

      await toast.promise(promise, {
        loading: "Deleting job...",
        success: "Deleted job",
      });

      refetch();
      return true;
    } catch (e) {
      console.log("Error deleting job", e);
      return false;
    }
  };

  const updateJob = async (jobId, data) => {
    try {
      const promise = authFetch(
        `/api/events/${eventId}/locations/${locationId}/jobs/${jobId}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        }
      ).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return true;
      });

      await toast.promise(promise, {
        loading: "Updating job...",
        success: "Updated job",
        error: "Error updating job",
      });

      refetch();
      return true;
    } catch (e) {
      console.log("Error updating job", e);
      return false;
    }
  };

  return {
    jobs: data?.jobs,
    createJob,
    deleteJob,
    updateJob,
    loading: isLoading,
    error,
    refetch,
  };
};
