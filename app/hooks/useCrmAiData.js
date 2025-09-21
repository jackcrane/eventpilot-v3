import { useState } from "react";
import { useCrmAiHydration } from "./useCrmAiHydration";

const EMPTY_AI = {
  enabled: false,
  savedSegmentId: null,
  ast: null,
  title: "",
};

export const useCrmAiData = ({
  storedFilters,
  setStoredFilters,
  savedSegments,
  runSavedSegment,
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
      const nextSaved = savedSegmentId ?? prior.savedSegmentId ?? null;
      const nextAst = ast ?? prior.ast ?? null;
      const nextTitle = title ?? prior.title ?? "";
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
    if (results) setAiResults(results);
    if (savedSegmentId) setCurrentSavedId(savedSegmentId);
    setSavedTitle(title || "");
    setLastAst(ast || null);
    setLastPrompt(prompt || "");
    persist({ savedSegmentId, ast, title });
  };

  useCrmAiHydration({
    hydrated,
    setHydrated,
    storedFilters,
    savedSegments,
    runSavedSegment,
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
    aiTitle: savedTitle || storedFilters?.ai?.title || lastPrompt || "AI Filter",
    usingAi: !!aiResults,
  };
};
