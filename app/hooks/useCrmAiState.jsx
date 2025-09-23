import { useCrmAiData } from "./useCrmAiData";
import { useCrmAiDialogs } from "./useCrmAiDialogs";

export const useCrmAiState = ({
  eventId,
  storedFilters,
  storedFiltersLoading,
  setStoredFilters,
  savedSegments,
  savedSegmentsLoading,
  runSavedSegment,
  offcanvas,
  close,
  pagination,
}) => {
  const data = useCrmAiData({
    storedFilters,
    storedFiltersLoading,
    setStoredFilters,
    savedSegments,
    savedSegmentsLoading,
    runSavedSegment,
    defaultPagination: pagination,
  });

  const dialogs = useCrmAiDialogs({
    eventId,
    offcanvas,
    close,
    apply: data.apply,
    currentSavedId: data.currentSavedId,
    lastPrompt: data.lastPrompt,
    lastAst: data.lastAst,
    savedTitle: data.savedTitle,
    storedFilters,
    pagination,
  });

  return {
    aiResults: data.aiResults,
    currentSavedId: data.currentSavedId,
    savedTitle: data.savedTitle,
    lastPrompt: data.lastPrompt,
    lastAst: data.lastAst,
    clearAi: data.clearAi,
    aiTitle: data.aiTitle,
    usingAi: data.usingAi,
    updateResults: data.updateResults,
    openPrompt: dialogs.openPrompt,
    openRefine: dialogs.openRefine,
  };
};
