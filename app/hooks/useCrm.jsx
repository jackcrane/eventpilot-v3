import useSWR, { mutate } from "swr";
import { authFetch } from "../util/url";



const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useCrm = ({ eventId }) => {
  const key = `/api/events/${eventId}/crm`;

  const { data, error, isLoading, isValidating } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
  });
  
  
  
  

  return {
    crmFields: data?.crmFields,
    crmPersons: data?.crmPersons,
    loading: isLoading,
    validating: isValidating,
    error,
    refetch: () => mutate(key)
  };
};
