import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Typography } from "tabler-react-2";
import { Icon } from "../../util/Icon";
import { Row } from "../../util/Flex";
import { useCrmGenerativeSegment } from "../../hooks/useCrmGenerativeSegment";
import { useCrmSavedSegments } from "../../hooks/useCrmSavedSegments";
import { CrmSegmentAstEditor } from "../AiASTViewer/AiASTViewer";

/**
 * Offcanvas content for refining an AI segment title and prompt.
 * All networking is performed via hooks.
 */
export const AiSegmentRefinePanel = ({
  eventId,
  currentSavedId,
  lastPrompt = "",
  lastAst = null,
  savedTitle = "",
  defaultTitle = "",
  onApply, // ({ results, savedSegmentId, ast, title, prompt })
  onClose,
}) => {
  const { generate, loading: generating } = useCrmGenerativeSegment({
    eventId,
  });
  const {
    savedSegments,
    updateSavedSegment,
    createSavedSegment,
    suggestTitle,
  } = useCrmSavedSegments({ eventId });

  const seg = useMemo(
    () => (savedSegments || []).find((s) => s.id === currentSavedId),
    [savedSegments, currentSavedId]
  );

  const [title, setTitle] = useState(
    savedTitle || seg?.title || defaultTitle || ""
  );
  const [prompt, setPrompt] = useState(lastPrompt || seg?.prompt || "");

  useEffect(() => {
    if ((!prompt || !prompt.trim()) && (lastPrompt || seg?.prompt)) {
      setPrompt(lastPrompt || seg?.prompt || "");
    }
    if (
      (!title || !title.trim()) &&
      (savedTitle || seg?.title || defaultTitle)
    ) {
      setTitle(savedTitle || seg?.title || defaultTitle || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastPrompt, savedTitle, seg?.prompt, seg?.title]);

  const onApplyClick = async () => {
    const promptChanged = (prompt || "").trim() !== (lastPrompt || "").trim();
    if (!promptChanged && currentSavedId) {
      const updated = await updateSavedSegment(currentSavedId, {
        title: (title || "").trim() || null,
      });
      const newTitle =
        updated?.ok && updated?.savedSegment
          ? updated.savedSegment.title || ""
          : title;
      onApply?.({
        results: null,
        savedSegmentId: currentSavedId,
        ast: lastAst,
        title: newTitle,
        prompt,
      });
      onClose?.();
      return;
    }

    const res = await generate({ prompt, debug: false });
    if (res?.ok && res?.results) {
      let newTitle = (title || "").trim();
      const saved = await createSavedSegment({
        title: newTitle,
        prompt,
        ast: res.segment,
      });
      let savedId = null;
      if (saved?.ok && saved?.savedSegment) {
        savedId = saved.savedSegment.id;
        if (!newTitle) {
          const suggestion = await suggestTitle({ prompt, ast: res.segment });
          if (suggestion?.ok && suggestion?.title) {
            const upd = await updateSavedSegment(savedId, {
              title: suggestion.title,
            });
            newTitle =
              upd?.ok && upd?.savedSegment
                ? upd.savedSegment.title || suggestion.title
                : suggestion.title;
          }
        }
      }
      onApply?.({
        results: res.results,
        savedSegmentId: savedId,
        ast: res.segment,
        title: newTitle,
        prompt,
      });
      onClose?.();
    }
  };

  return (
    <div>
      <Typography.H5 className="mb-0 text-secondary">
        REFINE AI FILTER
      </Typography.H5>
      <Typography.H1>Edit title and prompt</Typography.H1>

      <div className="mb-2">
        <Alert
          variant="warning"
          title={
            <Row gap={1} align="center">
              <Icon i="alert-triangle" />
              <Typography.B className="mb-0">AI can make mistakes</Typography.B>
            </Row>
          }
        >
          Review suggestions and verify before taking action.
        </Alert>
      </div>

      <div className="mb-2">
        <label className="form-label">Title</label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. 2024 Half - Last Minute"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="mb-2">
        <label className="form-label">Original Prompt</label>
        <textarea
          className="form-control"
          rows={6}
          placeholder="Describe who you want to find"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      <Row gap={1}>
        <Button
          className="ai-button"
          loading={generating}
          onClick={onApplyClick}
        >
          Apply
        </Button>
      </Row>

      {(seg?.ast || lastAst) && (
        <details className="mb-2" style={{ marginTop: 8 }}>
          <summary style={{ marginTop: 12, color: "var(--tblr-secondary)" }}>
            View underlying abstract syntax tree (Advanced)
          </summary>
          <pre>{JSON.stringify(seg?.ast || lastAst, null, 2)}</pre>
          <CrmSegmentAstEditor
            initialAst={seg?.ast || lastAst}
            onAstChange={console.log}
          />
        </details>
      )}
    </div>
  );
};
