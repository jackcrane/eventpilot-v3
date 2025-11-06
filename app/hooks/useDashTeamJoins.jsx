import useSWR, { useSWRConfig } from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useDashTeamJoins = ({ eventId }) => {
  const key = eventId ? `/api/events/${eventId}/dash/team-joins` : null;
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR(key, fetcher);

  return {
    totalOnTeams: data?.totalOnTeams ?? 0,
    trend: data?.trend || null,
    loading: isLoading,
    error,
    refetch: () => (key ? mutate(key) : undefined),
  };
};
