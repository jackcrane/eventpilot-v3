import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Alert, Typography } from "tabler-react-2";
import {
  DEFAULT_WEBSITE_DATA,
  createWebsiteEditorConfig,
} from "./websiteConfig";
import { createId } from "@paralleldrive/cuid2";

const normalizeBlock = (block) => {
  if (!block) return block;
  const blockId = (block.id && block.id.toString()) || createId();
  const props = block.props || {};
  const propIdValue =
    typeof props.id === "string" && props.id.trim().length > 0
      ? props.id.trim()
      : props.id;
  const propId = (propIdValue && propIdValue.toString()) || `section-${blockId}`;
  return {
    ...block,
    id: blockId,
    props: {
      ...props,
      id: propId,
    },
  };
};

const withStableIds = (content = []) =>
  content.map((block) => normalizeBlock(block));

const normalizeZones = (zones = {}) =>
  Object.fromEntries(
    Object.entries(zones).map(([zoneId, zoneContent]) => [
      zoneId,
      withStableIds(zoneContent),
    ])
  );

const usePuckModule = () => {
  const [moduleRef, setModuleRef] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      import("@measured/puck"),
      import("@measured/puck/puck.css").catch(() => null),
    ])
      .then(([module]) => {
        if (!cancelled) setModuleRef(module);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { moduleRef, error };
};

export const WebsiteEditor = () => {
  const { moduleRef, error } = usePuckModule();
  const Puck = moduleRef?.Puck;
  const [draftData, setDraftData] = useState(() => ({
    ...DEFAULT_WEBSITE_DATA,
    content: withStableIds(DEFAULT_WEBSITE_DATA.content),
    root: DEFAULT_WEBSITE_DATA.root ?? {},
    zones: normalizeZones(DEFAULT_WEBSITE_DATA.zones),
  }));
  const [, startTransition] = useTransition();
  const config = useMemo(() => createWebsiteEditorConfig(), []);

  const handleDraftUpdate = useCallback(
    (payload) => {
      if (!payload) return;
      const nextData = payload?.data ?? payload;
      if (nextData == null) return;
      const cloned =
        typeof structuredClone === "function"
          ? structuredClone(nextData)
          : JSON.parse(JSON.stringify(nextData));

      const normalized = {
        ...cloned,
        content: withStableIds(cloned.content),
        root: cloned.root ?? {},
        zones: normalizeZones(cloned.zones),
      };

      startTransition(() => {
        setDraftData(normalized);
      });
    },
    [startTransition]
  );

  return (
    <div>
      <Typography.H3 className="mb-2">Visual editor</Typography.H3>
      <Typography.Text className="mb-3 d-block">
        The editor below is fully client-side for now. Changes persist only
        while this page is open.
      </Typography.Text>
      {error ? (
        <Alert variant="danger" title="Unable to load the editor" className="mb-3">
          {error.message}
        </Alert>
      ) : null}
      {!Puck && !error ? (
        <Typography.Text className="d-block">Loading editor…</Typography.Text>
      ) : null}
      {Puck ? (
        <div
          style={{
            overflow: "hidden",
            minHeight: 480,
          }}
        >
          <Puck
            config={config}
            data={draftData}
            onPublish={handleDraftUpdate}
            onChange={handleDraftUpdate}
          />
        </div>
      ) : null}
    </div>
  );
};
