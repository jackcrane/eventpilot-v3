import { useDbState } from "./useDbState";

const DEFAULT_STATE = {
  manual: { search: "", filters: [] },
  ai: { enabled: false, savedSegmentId: null, ast: null, title: "" },
};

export const useCrmStoredFilters = () => {
  return useDbState(DEFAULT_STATE, "crmFilters");
};
