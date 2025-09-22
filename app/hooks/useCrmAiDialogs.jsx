import React from "react";
import { AiSegmentPromptPanel } from "../components/crmAi/AiSegmentPromptPanel";
import { AiSegmentRefinePanel } from "../components/crmAi/AiSegmentRefinePanel";

export const useCrmAiDialogs = ({
  eventId,
  offcanvas,
  close,
  apply,
  currentSavedId,
  lastPrompt,
  lastAst,
  savedTitle,
  storedFilters,
  pagination,
}) => {
  const openPrompt = (defaults = {}) => {
    offcanvas({
      content: (
        <AiSegmentPromptPanel
          eventId={eventId}
          initialTitle={defaults.title || ""}
          initialPrompt={defaults.prompt || ""}
          pagination={pagination}
          onApply={apply}
          onClose={close}
        />
      ),
    });
  };

  const openRefine = () => {
    offcanvas({
      content: (
        <AiSegmentRefinePanel
          eventId={eventId}
          currentSavedId={currentSavedId}
          lastPrompt={lastPrompt}
          lastAst={lastAst}
          savedTitle={savedTitle}
          defaultTitle={storedFilters?.ai?.title || ""}
          pagination={pagination}
          onApply={apply}
          onClose={close}
        />
      ),
    });
  };

  return { openPrompt, openRefine };
};
