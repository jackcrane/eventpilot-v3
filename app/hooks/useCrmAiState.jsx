import { useCrmAiData } from "./useCrmAiData";
import { useCrmAiDialogs } from "./useCrmAiDialogs";

export const useCrmAiState = ({
  eventId,
  storedFilters,
  setStoredFilters,
  savedSegments,
  runSavedSegment,
  offcanvas,
  close,
}) => {
  const data = useCrmAiData({
    storedFilters,
    setStoredFilters,
    savedSegments,
    runSavedSegment,
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
    openPrompt: dialogs.openPrompt,
    openRefine: dialogs.openRefine,
  };
};
