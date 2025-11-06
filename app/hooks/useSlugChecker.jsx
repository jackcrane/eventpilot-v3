import useSWR from "swr";
import { authFetch } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useSlugChecker = ({ slug, type }) => {
  const {
    data,
    error,
    isLoading,
    mutate: refetch,
  } = useSWR(`/api/slug?s=${type}:${slug}`, fetcher);

  return {
    slugPresent: data?.present || false,
    loading: isLoading,
    error,
    refetch,
  };
};
