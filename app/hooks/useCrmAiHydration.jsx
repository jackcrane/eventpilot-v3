import { useEffect } from "react";

export const useCrmAiHydration = ({
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
}) => {
  useEffect(() => {
    if (hydrated) return;
    const ai = storedFilters?.ai;
    if (!ai?.enabled) {
      setHydrated(true);
      return;
    }

    const execute = async () => {
      const filter = ai?.ast?.filter || ai?.ast;
      let response = null;
      let segmentForPrompt = null;

      if (filter) {
        response = await runSavedSegment({ filter, debug: !!ai?.ast?.debug });
      } else if (ai?.savedSegmentId) {
        const segment = (savedSegments || []).find((item) => item.id === ai.savedSegmentId);
        if (segment) {
          segmentForPrompt = segment;
          response = await runSavedSegment({ filter: segment?.ast?.filter || segment?.ast });
        }
      }

      if (response?.ok) {
        setAiResults(response);
        setCurrentSavedId(ai.savedSegmentId || null);
        setSavedTitle(ai.title || segmentForPrompt?.title || "");
        setLastAst(ai.ast || segmentForPrompt?.ast || null);
        if (segmentForPrompt?.prompt) setLastPrompt(segmentForPrompt.prompt);
      }
      setHydrated(true);
    };

    execute();
  }, [
    hydrated,
    storedFilters,
    savedSegments,
    runSavedSegment,
    setHydrated,
    setAiResults,
    setCurrentSavedId,
    setSavedTitle,
    setLastAst,
    setLastPrompt,
  ]);

  useEffect(() => {
    if (lastPrompt?.trim()) return;
    if (!currentSavedId) return;
    const segment = (savedSegments || []).find((item) => item.id === currentSavedId);
    if (segment?.prompt) setLastPrompt(segment.prompt);
  }, [lastPrompt, currentSavedId, savedSegments, setLastPrompt]);
};
