import useSWR from "swr";
import { publicFetch } from "../util/url";

const fetcher = (url) => publicFetch(url).then((r) => r.json());

export const usePublicTeams = ({ eventId }) => {
  const key = eventId ? `/api/events/${eventId}/registration/team` : null;
  const { data, error, isLoading } = useSWR(key, fetcher);

  return {
    teams: data?.teams,
    loading: isLoading,
    error,
  };
};
