import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Alert, Button, Typography } from "tabler-react-2";
import {
  DEFAULT_WEBSITE_DATA,
  createWebsiteEditorConfig,
} from "./websiteConfig";
import { createId } from "@paralleldrive/cuid2";
import styles from "./WebsiteEditor.module.css";
import { IconButton } from "@measured/puck";
import { TbArrowsMaximize, TbArrowsMinimize } from "react-icons/tb";
import { useParams } from "react-router-dom";
import { useEventWebsite } from "../../hooks/useEventWebsite";

const normalizeBlock = (block) => {
  if (!block) return block;
  const blockId = (block.id && block.id.toString()) || createId();
  const props = block.props || {};
  const propIdValue =
    typeof props.id === "string" && props.id.trim().length > 0
      ? props.id.trim()
      : props.id;
  const propId =
    (propIdValue && propIdValue.toString()) || `section-${blockId}`;
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

const cloneJson = (value) => {
  if (value == null) return null;
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // Fall through to JSON clone
    }
  }
  return JSON.parse(JSON.stringify(value));
};

const isPlainObject = (value) =>
  !!value && typeof value === "object" && !Array.isArray(value);

const normalizeEditorData = (data) => {
  const source = isPlainObject(data) ? cloneJson(data) : {};
  const fallbackContent = Array.isArray(DEFAULT_WEBSITE_DATA.content)
    ? DEFAULT_WEBSITE_DATA.content
    : [];
  const fallbackRoot = isPlainObject(DEFAULT_WEBSITE_DATA.root)
    ? DEFAULT_WEBSITE_DATA.root
    : {};
  const fallbackZones = isPlainObject(DEFAULT_WEBSITE_DATA.zones)
    ? DEFAULT_WEBSITE_DATA.zones
    : {};

  return {
    ...source,
    content: withStableIds(
      Array.isArray(source.content) ? source.content : fallbackContent
    ),
    root:
      cloneJson(isPlainObject(source.root) ? source.root : fallbackRoot) || {},
    zones: normalizeZones(
      isPlainObject(source.zones) ? source.zones : fallbackZones
    ),
  };
};

export const WebsiteEditor = () => {
  const { moduleRef, error } = usePuckModule();
  const Puck = moduleRef?.Puck;
  const defaultEditorData = useMemo(
    () => normalizeEditorData(DEFAULT_WEBSITE_DATA),
    []
  );
  const [draftData, setDraftData] = useState(() => defaultEditorData);
  const [, startTransition] = useTransition();
  const config = useMemo(() => createWebsiteEditorConfig(), []);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { eventId } = useParams();
  const routeKey = "home";

  const {
    websitePage,
    loading: websiteLoading,
    error: websiteError,
    saveWebsite,
    saving,
  } = useEventWebsite({ eventId, routeKey });

  const resolveNormalizedDraft = useCallback((payload) => {
    if (!payload) return null;
    const nextData = payload?.data ?? payload;
    if (nextData == null) return null;
    return normalizeEditorData(nextData);
  }, []);

  const handleDraftUpdate = useCallback(
    (payload) => {
      const normalized = resolveNormalizedDraft(payload);
      if (!normalized) return;
      startTransition(() => {
        setDraftData(normalized);
      });
    },
    [resolveNormalizedDraft, startTransition]
  );

  const handlePublish = useCallback(
    async (payload) => {
      const normalized = resolveNormalizedDraft(payload);
      if (!normalized) return;
      startTransition(() => {
        setDraftData(normalized);
      });
      await saveWebsite(normalized);
    },
    [resolveNormalizedDraft, saveWebsite, startTransition]
  );

  const handleManualSave = useCallback(() => {
    if (!draftData) return;
    void saveWebsite(draftData);
  }, [draftData, saveWebsite]);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        exitFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exitFullscreen, isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!websitePage) return;
    const remoteData = websitePage.data;
    if (remoteData) {
      const normalized = normalizeEditorData(remoteData);
      startTransition(() => {
        setDraftData(normalized);
      });
      return;
    }
    if (!websiteLoading) {
      startTransition(() => {
        setDraftData(defaultEditorData);
      });
    }
  }, [defaultEditorData, websiteLoading, websitePage, startTransition]);

  const HeaderActionsOverride = useCallback(
    ({ children }) => (
      <div className={styles.menuActions}>
        <IconButton
          type="button"
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          aria-pressed={isFullscreen}
        >
          {isFullscreen ? (
            <TbArrowsMinimize size={18} aria-hidden="true" />
          ) : (
            <TbArrowsMaximize size={18} aria-hidden="true" />
          )}
        </IconButton>
        {children}
      </div>
    ),
    [isFullscreen, toggleFullscreen]
  );

  const puckOverrides = useMemo(
    () => ({
      headerActions: HeaderActionsOverride,
    }),
    [HeaderActionsOverride]
  );

  return (
    <div>
      <Typography.H3 className="mb-2">Visual editor</Typography.H3>
      <Typography.Text className="mb-3 d-block">
        Design your hosted website and publish whenever you are ready. Saving
        stores the current page layout for this event.
      </Typography.Text>
      {websiteError ? (
        <Alert
          variant="danger"
          title="Unable to load saved website"
          className="mb-3"
        >
          {websiteError.message}
        </Alert>
      ) : null}
      {error ? (
        <Alert
          variant="danger"
          title="Unable to load the editor"
          className="mb-3"
        >
          {error.message}
        </Alert>
      ) : null}
      {!Puck && !error ? (
        <Typography.Text className="d-block">
          {websiteLoading ? "Loading website…" : "Loading editor…"}
        </Typography.Text>
      ) : null}
      {Puck ? (
        <React.Fragment>
          <div
            className={`${styles.fullscreenBackdrop}${
              isFullscreen ? ` ${styles.fullscreenBackdropVisible}` : ""
            }`}
            aria-hidden={!isFullscreen}
            onClick={exitFullscreen}
          />
          <div
            className={`${styles.puckShell}${
              isFullscreen ? ` ${styles.puckShellFullscreen}` : ""
            }`}
          >
            <div className={styles.puckContainer}>
              <Puck
                config={config}
                data={draftData}
                onPublish={handlePublish}
                onChange={handleDraftUpdate}
                overrides={puckOverrides}
              />
            </div>
          </div>
        </React.Fragment>
      ) : null}
    </div>
  );
};
