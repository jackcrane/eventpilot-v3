import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import toast from "react-hot-toast";

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
  const fallbackContent = Array.isArray(DEFAULT_WEBSITE_DATA.content)
    ? DEFAULT_WEBSITE_DATA.content
    : [];
  const fallbackRoot = isPlainObject(DEFAULT_WEBSITE_DATA.root)
    ? DEFAULT_WEBSITE_DATA.root
    : {};
  const fallbackZones = isPlainObject(DEFAULT_WEBSITE_DATA.zones)
    ? DEFAULT_WEBSITE_DATA.zones
    : {};

  const base = Array.isArray(data)
    ? { content: cloneJson(data) }
    : isPlainObject(data)
      ? cloneJson(data)
      : {};

  const rawContent = Array.isArray(base.content)
    ? base.content
    : Array.isArray(base.blocks)
      ? base.blocks
      : fallbackContent;

  const rawRoot = isPlainObject(base.root) ? base.root : fallbackRoot;
  const rawZones = isPlainObject(base.zones) ? base.zones : fallbackZones;

  return {
    ...base,
    content: withStableIds(rawContent),
    root: cloneJson(rawRoot) || {},
    zones: normalizeZones(rawZones),
  };
};

const areDraftsEqual = (left, right) => {
  if (left === right) return true;
  if (!left || !right) return false;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
};

const slugifyRouteKey = (value) => {
  if (typeof value !== "string") return "";
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 100);
  return slug;
};

const formatRouteLabel = (key) => {
  if (key === "home") return "Home";
  return `/${key}`;
};

export const WebsiteEditor = () => {
  const { moduleRef, error } = usePuckModule();
  const Puck = moduleRef?.Puck;
  const defaultEditorData = useMemo(
    () => normalizeEditorData(DEFAULT_WEBSITE_DATA),
    []
  );
  const [draftsByRoute, setDraftsByRoute] = useState(() => ({}));
  const config = useMemo(() => createWebsiteEditorConfig(), []);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { eventId } = useParams();
  const [routeKey, setRouteKey] = useState("home");

  const {
    websitePage,
    loading: websiteLoading,
    error: websiteError,
    saveWebsite,
    saving,
    availableRouteKeys,
  } = useEventWebsite({ eventId, routeKey });

  const normalizedRemoteData = useMemo(() => {
    if (!websitePage?.data) return null;
    return normalizeEditorData(websitePage.data);
  }, [websitePage?.data]);

  const currentDraft = useMemo(() => {
    return draftsByRoute[routeKey] ?? normalizedRemoteData ?? defaultEditorData;
  }, [draftsByRoute, routeKey, normalizedRemoteData, defaultEditorData]);

  const routeOptions = useMemo(() => {
    const normalized = Array.isArray(availableRouteKeys)
      ? availableRouteKeys.filter(
          (key) => typeof key === "string" && key.trim().length > 0
        )
      : [];
    const draftKeys = Object.keys(draftsByRoute);
    const merged = Array.from(
      new Set([...normalized, ...draftKeys, routeKey])
    );
    return merged.sort((a, b) => {
      if (a === "home") return -1;
      if (b === "home") return 1;
      return a.localeCompare(b);
    });
  }, [availableRouteKeys, draftsByRoute, routeKey]);

  const resolveNormalizedDraft = useCallback((payload) => {
    if (!payload) return null;
    const nextData = payload?.data ?? payload;
    if (nextData == null) return null;
    return normalizeEditorData(nextData);
  }, []);

  useEffect(() => {
    setRouteKey("home");
    setDraftsByRoute({});
  }, [eventId]);

  const handleDraftUpdate = useCallback(
    (payload) => {
      const normalized = resolveNormalizedDraft(payload);
      if (!normalized) return;
      setDraftsByRoute((previous) => ({
        ...previous,
        [routeKey]: normalized,
      }));
    },
    [resolveNormalizedDraft, routeKey]
  );

  const handlePublish = useCallback(
    async (payload) => {
      const normalized = resolveNormalizedDraft(payload);
      if (!normalized) return;
      setDraftsByRoute((previous) => ({
        ...previous,
        [routeKey]: normalized,
      }));
      await saveWebsite(normalized, routeKey);
    },
    [resolveNormalizedDraft, routeKey, saveWebsite]
  );

  const handleManualSave = useCallback(() => {
    const draft = draftsByRoute[routeKey] ?? currentDraft;
    if (!draft) return;
    void saveWebsite(draft, routeKey);
  }, [currentDraft, draftsByRoute, routeKey, saveWebsite]);

  const handleRouteChange = useCallback(
    (event) => {
      const nextKey = (event?.target?.value || "").trim();
      if (!nextKey || nextKey === routeKey) return;
      setRouteKey(nextKey);
    },
    [routeKey]
  );

  const handleCreatePage = useCallback(() => {
    const input =
      typeof window !== "undefined"
        ? window.prompt("Enter a URL slug for the new page (e.g. schedule)")
        : null;
    if (input == null) return;
    const slug = slugifyRouteKey(input);
    if (!slug) {
      toast.error("Page key must include letters or numbers.");
      return;
    }
    if (routeOptions.includes(slug)) {
      toast.error("That page already exists.");
      return;
    }
    setRouteKey(slug);
  }, [routeOptions]);

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
    if (websitePage.routeKey && websitePage.routeKey !== routeKey) {
      setRouteKey(websitePage.routeKey);
      return;
    }
    if (normalizedRemoteData) {
      setDraftsByRoute((previous) => {
        const existing = previous[routeKey];
        if (
          existing &&
          existing !== defaultEditorData &&
          areDraftsEqual(existing, normalizedRemoteData)
        ) {
          return previous;
        }
        return {
          ...previous,
          [routeKey]: normalizedRemoteData,
        };
      });
      return;
    }
    if (!websiteLoading) {
      setDraftsByRoute((previous) => {
        if (previous[routeKey]) return previous;
        return {
          ...previous,
          [routeKey]: defaultEditorData,
        };
      });
    }
  }, [
    defaultEditorData,
    normalizedRemoteData,
    routeKey,
    websiteLoading,
    websitePage,
  ]);

  useEffect(() => {
    if (!routeKey) return;
    setDraftsByRoute((previous) => {
      if (previous[routeKey]) {
        return previous;
      }
      return {
        ...previous,
        [routeKey]: defaultEditorData,
      };
    });
  }, [defaultEditorData, routeKey]);

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
      <div className={styles.pageToolbar}>
        <label className={styles.pageLabel} htmlFor="website-editor-route-key">
          Page
        </label>
        <select
          id="website-editor-route-key"
          className={styles.pageSelect}
          value={routeKey}
          onChange={handleRouteChange}
          disabled={websiteLoading && !websitePage}
        >
          {routeOptions.map((key) => (
            <option key={key} value={key}>
              {formatRouteLabel(key)}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          onClick={handleCreatePage}
          disabled={saving}
        >
          Create page
        </Button>
      </div>
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
          {websiteLoading ? "Loading page…" : "Loading editor…"}
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
                key={routeKey}
                config={config}
                data={currentDraft}
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
