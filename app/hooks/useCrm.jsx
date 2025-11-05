import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useCrm = ({ eventId, includePersons = false } = {}) => {
  const key = eventId
    ? `/api/events/${eventId}/crm${includePersons ? "?includePersons=true" : ""}`
    : null;

  const { data, error, isLoading, isValidating } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
  });

  return {
    crmFields: data?.crmFields,
    crmPersons: data?.crmPersons,
    loading: isLoading && typeof data === "undefined",
    validating: isValidating,
    error,
    refetch: () => (key ? mutate(key) : Promise.resolve()),
  };
};
