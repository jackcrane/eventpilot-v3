import useSWR, { useSWRConfig } from "swr";
import { authFetch } from "../util/url";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { useLocation } from "./useLocation";
import { capturePosthogEvent } from "../util/posthog";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useJobs = ({ eventId, locationId }) => {
  const { mutate: boundMutate } = useSWRConfig();
  const invalidateLocationCache = () => {
    boundMutate(`/api/events/${eventId}/locations/${locationId}?includeShifts=true`);
    boundMutate(`/api/events/${eventId}/locations/${locationId}`);
  };

  const { refetch: refetchLocation } = useLocation({
    eventId,
    locationId,
    includeShifts: true,
  });

  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(`/api/events/${eventId}/locations/${locationId}/jobs`, fetcher);
  const [mutationLoading, setMutationLoading] = useState(false);

  const createJob = async (data) => {
    setMutationLoading(true);
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

      capturePosthogEvent("ui_job_created", {
        event_id: eventId,
        location_id: locationId,
        job_name: data?.name,
        shift_count: data?.shifts?.length || 0,
        total_shift_capacity:
          data?.shifts?.reduce(
            (total, shift) => total + (Number(shift?.capacity) || 0),
            0
          ) || 0,
      });

      setMutationLoading(false);

      refetch();
      invalidateLocationCache();
      return true;
    } catch (e) {
      setMutationLoading(false);
      console.log("Error creating job", e);
      return false;
    }
  };

  const deleteJob = async (jobId) => {
    setMutationLoading(true);
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

      capturePosthogEvent("ui_job_deleted", {
        event_id: eventId,
        location_id: locationId,
        job_id: jobId,
      });

      setMutationLoading(false);

      refetch();
      invalidateLocationCache();
      return true;
    } catch (e) {
      setMutationLoading(false);
      console.log("Error deleting job", e);
      return false;
    }
  };

  const updateJob = async (jobId, data) => {
    setMutationLoading(true);
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

      capturePosthogEvent("ui_job_updated", {
        event_id: eventId,
        location_id: locationId,
        job_id: jobId,
        changed_fields: Object.keys(data || {}),
        shift_count: data?.shifts?.length || 0,
      });

      setMutationLoading(false);
      refetch();
      invalidateLocationCache();
      return true;
    } catch (e) {
      setMutationLoading(false);
      console.log("Error updating job", e);
      return false;
    }
  };

  return {
    jobs: data?.jobs,
    createJob,
    deleteJob,
    updateJob,
    loading: isLoading || mutationLoading,
    error,
    refetch,
  };
};
