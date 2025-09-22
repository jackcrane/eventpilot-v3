import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, SegmentedControl, Typography } from "tabler-react-2";
import moment from "moment";
import { Icon } from "../../util/Icon";
import { Row } from "../../util/Flex";
import { useCrmGenerativeSegment } from "../../hooks/useCrmGenerativeSegment";
import { useCrmSavedSegments } from "../../hooks/useCrmSavedSegments";
import {
  useCrmSegment,
  DEFAULT_SEGMENT_PAGINATION,
} from "../../hooks/useCrmSegment";

/**
 * Offcanvas content for prompting AI segments and selecting previous ones.
 * All networking is performed via hooks.
 */
export const AiSegmentPromptPanel = ({
  eventId,
  initialTitle = "",
  initialPrompt = "",
  pagination,
  onApply, // ({ results, savedSegmentId, ast, title, prompt })
  onClose,
}) => {
  const { generate, loading: generating } = useCrmGenerativeSegment({
    eventId,
  });
  const {
    savedSegments,
    createSavedSegment,
    updateSavedSegment,
    updateSavedSegmentQuiet,
    suggestTitle,
    markUsed,
  } = useCrmSavedSegments({ eventId });
  const { run: runSavedSegment, loading: runningSaved } = useCrmSegment({
    eventId,
  });

  const effectivePagination = {
    ...(pagination || DEFAULT_SEGMENT_PAGINATION),
    page: 1,
  };

  const [tab, setTab] = useState(
    (savedSegments || []).length ? "previous" : "new"
  );
  const [savedLocal, setSavedLocal] = useState(savedSegments || []);
  const [title, setTitle] = useState(initialTitle || "");
  const [prompt, setPrompt] = useState(initialPrompt || "");

  useEffect(() => setSavedLocal(savedSegments || []), [savedSegments]);

  const onRunSaved = async (seg) => {
    const res = await runSavedSegment({
      filter: seg?.ast?.filter || seg?.ast,
      debug: !!seg?.ast?.debug,
      pagination: effectivePagination,
    });
    if (res?.ok) {
      await markUsed(seg.id);
      onApply?.({
        results: res,
        savedSegmentId: seg.id,
        ast: seg.ast,
        title: seg.title || seg.prompt || "",
        prompt: seg.prompt || "",
      });
      onClose?.();
    }
  };

  const onGenerate = async () => {
    const res = await generate({
      prompt,
      debug: false,
      pagination: effectivePagination,
    });
    if (!res?.ok || !res?.results) return;

    let savedTitle = (title || "").trim();
    // Persist the new segment regardless of title
    const created = await createSavedSegment({
      title: savedTitle,
      prompt,
      ast: res.segment,
    });
    let savedId = null;
    if (created?.ok && created?.savedSegment) {
      savedId = created.savedSegment.id;
      if (!savedTitle) {
        const suggestion = await suggestTitle({ prompt, ast: res.segment });
        if (suggestion?.ok && suggestion?.title) {
          const upd = await updateSavedSegment(savedId, {
            title: suggestion.title,
          });
          savedTitle =
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
      title: savedTitle || title || "",
      prompt,
    });
    onClose?.();
  };

  return (
    <div>
      <Typography.H5 className="mb-0 text-secondary">
        DESCRIBE YOUR SEGMENT
      </Typography.H5>
      <Typography.H1>Find what you need with AI</Typography.H1>

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

      <div className="mt-2 mb-3">
        <SegmentedControl
          value={tab}
          onChange={(e) => setTab(e.id)}
          items={[
            { label: "Previous Requests", id: "previous" },
            { label: "New Prompt", id: "new" },
          ]}
        />
      </div>

      {tab === "previous" ? (
        <div>
          {(!savedLocal || savedLocal.length === 0) && (
            <Typography.Text className="text-secondary">
              No saved requests yet. Run one and save it here.
            </Typography.Text>
          )}
          {(savedLocal || []).map((seg) => (
            <div
              key={seg.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--tblr-border-color, #e9ecef)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flex: "1 1 auto",
                  minWidth: 0,
                }}
              >
                <div
                  onClick={async (e) => {
                    e.stopPropagation();
                    const prev = seg.favorite;
                    setSavedLocal((list) =>
                      list.map((s) =>
                        s.id === seg.id ? { ...s, favorite: !prev } : s
                      )
                    );
                    const res = await updateSavedSegmentQuiet(seg.id, {
                      favorite: !prev,
                    });
                    if (!res?.ok) {
                      setSavedLocal((list) =>
                        list.map((s) =>
                          s.id === seg.id ? { ...s, favorite: prev } : s
                        )
                      );
                    }
                  }}
                  style={{ cursor: "pointer" }}
                  title={seg.favorite ? "Unfavorite" : "Favorite"}
                >
                  <Icon
                    i={seg.favorite ? "star-filled" : "star"}
                    color={seg.favorite ? "#f59f00" : "#adb5bd"}
                  />
                </div>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onRunSaved(seg);
                  }}
                  style={{ cursor: runningSaved ? "wait" : "pointer" }}
                  className="text-primary"
                  title="Open this filter"
                >
                  {seg.title?.trim() || seg.prompt?.slice(0, 80) || "Untitled"}
                </a>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--tblr-secondary, #868e96)",
                  flex: "0 0 160px",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                }}
              >
                {seg.lastUsed
                  ? `Last used ${moment(seg.lastUsed).fromNow()}`
                  : ""}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <Typography.Text>
            Tell the AI who you want to find. Include iteration context (e.g.,
            this year, previous, instance name), participant vs volunteer, tiers
            or periods by name, and any NOT conditions.
          </Typography.Text>
          <textarea
            className="form-control"
            rows={6}
            placeholder="e.g. Participants in 2024 who registered during Last Minute for the Half Marathon"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{ marginTop: 8 }}
          />
          <Button
            className="ai-button mt-2"
            loading={generating}
            onClick={onGenerate}
          >
            Generate
          </Button>
        </>
      )}
    </div>
  );
};
