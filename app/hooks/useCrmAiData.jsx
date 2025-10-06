import { useCallback, useState } from "react";
import { useCrmAiHydration } from "./useCrmAiHydration";

const EMPTY_AI = {
  enabled: false,
  savedSegmentId: null,
  ast: null,
  title: "",
};

export const useCrmAiData = ({
  storedFilters,
  storedFiltersLoading,
  setStoredFilters,
  savedSegments,
  savedSegmentsLoading,
  runSavedSegment,
  defaultPagination,
}) => {
  const [aiResults, setAiResults] = useState(null),
    [currentSavedId, setCurrentSavedId] = useState(null),
    [lastPrompt, setLastPrompt] = useState(""),
    [lastAst, setLastAst] = useState(null),
    [savedTitle, setSavedTitle] = useState(""),
    [hydrated, setHydrated] = useState(false);

  const persist = ({ savedSegmentId, ast, title }) => {
    setStoredFilters((prev) => {
      const prior = prev?.ai || EMPTY_AI;
      const nextSaved =
        savedSegmentId !== undefined
          ? savedSegmentId
          : prior.savedSegmentId ?? null;
      const nextAst =
        ast !== undefined ? ast : prior.ast ?? null;
      const nextTitle =
        title !== undefined ? title : prior.title ?? "";
      return {
        ...(prev || {}),
        ai: {
          enabled: !!(nextSaved || nextAst),
          savedSegmentId: nextSaved,
          ast: nextAst,
          title: nextTitle,
        },
      };
    });
  };

  const clearAi = () => {
    setAiResults(null);
    setCurrentSavedId(null);
    setLastAst(null);
    setLastPrompt("");
    setSavedTitle("");
    setStoredFilters((prev) => ({ ...(prev || {}), ai: { ...EMPTY_AI } }));
  };

  const apply = ({ results, savedSegmentId, ast, title, prompt }) => {
    setAiResults(results || null);
    setCurrentSavedId(savedSegmentId ?? null);
    setSavedTitle(title || "");
    setLastAst(ast || null);
    setLastPrompt(prompt || "");
    persist({
      savedSegmentId: savedSegmentId ?? null,
      ast,
      title,
    });
  };

  const updateResults = useCallback(
    (results) => {
      setAiResults(results || null);
    },
    [setAiResults]
  );

  useCrmAiHydration({
    hydrated,
    setHydrated,
    storedFilters,
    storedFiltersLoading,
    savedSegments,
    savedSegmentsLoading,
    runSavedSegment,
    defaultPagination,
    setAiResults,
    setCurrentSavedId,
    setSavedTitle,
    setLastAst,
    setLastPrompt,
    lastPrompt,
    currentSavedId,
  });

  return {
    aiResults,
    currentSavedId,
    lastPrompt,
    lastAst,
    savedTitle,
    clearAi,
    apply,
    updateResults,
    aiTitle: savedTitle || storedFilters?.ai?.title || lastPrompt || "AI Filter",
    usingAi: Boolean(aiResults || lastAst || currentSavedId),
  };
};
