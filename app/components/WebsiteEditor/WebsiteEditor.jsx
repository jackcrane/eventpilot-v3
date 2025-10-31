import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  memo,
  useRef,
  useState,
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

const normalizeRouteSegment = (segment) => {
  if (typeof segment !== "string") return "";
  return segment
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
};

const slugifyRouteKey = (value) => {
  if (typeof value !== "string") return "";
  const segments = value
    .split("/")
    .map((segment) => normalizeRouteSegment(segment))
    .filter((segment) => segment.length > 0);
  const slug = segments.join("/");
  return slug.slice(0, 100);
};

const formatRouteLabel = (key) => {
  if (key === "home") return "Home";
  const segments = typeof key === "string" ? key.split("/").filter(Boolean) : [];
  const lastSegment = segments.at(-1);
  if (!lastSegment) {
    return `/${key}`;
  }
  const words = lastSegment.replace(/[-_]+/g, " ").trim();
  if (!words) {
    return `/${key}`;
  }
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const formatRoutePath = (key) => {
  if (!key || key === "home") return "/";
  return `/${key}`;
};

const buildRouteTree = (routeKeys) => {
  if (!Array.isArray(routeKeys)) return [];

  const uniqueKeys = Array.from(
    new Set(
      routeKeys
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value.length > 0)
    )
  );

  const hasHomeRoute = uniqueKeys.includes("home");
  const filteredKeys = uniqueKeys.filter((key) => key !== "home");

  const rootMap = new Map();

  filteredKeys.forEach((key) => {
    const segments = key.split("/").filter(Boolean);
    if (segments.length === 0) return;
    let parentMap = rootMap;
    let accumulated = "";

    segments.forEach((segment, index) => {
      accumulated = accumulated ? `${accumulated}/${segment}` : segment;
      const existing = parentMap.get(segment);
      if (existing) {
        if (index === segments.length - 1) {
          existing.isRoute = true;
        }
        parentMap = existing.children;
        return;
      }
      const node = {
        segment,
        fullKey: accumulated,
        label: formatRouteLabel(accumulated),
        isRoute: index === segments.length - 1,
        children: new Map(),
      };
      parentMap.set(segment, node);
      parentMap = node.children;
    });
  });

  const convertNodes = (nodeMap) =>
    Array.from(nodeMap.values())
      .sort((a, b) => a.segment.localeCompare(b.segment))
      .map((node) => ({
        fullKey: node.fullKey,
        label: node.label,
        isRoute: node.isRoute,
        children: convertNodes(node.children),
      }));

  const tree = convertNodes(rootMap);

  if (hasHomeRoute) {
    tree.unshift({
      fullKey: "home",
      label: formatRouteLabel("home"),
      isRoute: true,
      children: [],
    });
  }

  return tree;
};

const arraysShallowEqual = (left, right) => {
  if (left === right) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
};

const useStableArray = (array) => {
  const ref = useRef(array);
  return useMemo(() => {
    if (arraysShallowEqual(ref.current, array)) {
      return ref.current;
    }
    ref.current = array;
    return array;
  }, [array]);
};

const RouteTreeNodeComponent = ({
  node,
  activeRoute,
  onSelectRoute,
  routesDisabled,
}) => {
  const isActive = node.fullKey === activeRoute;
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;

  return (
    <li
      key={node.fullKey}
      className={styles.routeItem}
      role="treeitem"
      aria-selected={isActive || undefined}
      aria-expanded={hasChildren ? "true" : undefined}
    >
      {node.isRoute ? (
        <button
          type="button"
          className={
            isActive
              ? `${styles.routeButton} ${styles.routeButtonActive}`
              : styles.routeButton
          }
          disabled={routesDisabled}
          onClick={() => onSelectRoute(node.fullKey)}
          aria-current={isActive ? "true" : undefined}
          title={formatRoutePath(node.fullKey)}
        >
          {node.label}
        </button>
      ) : (
        <div
          className={styles.routeBranchLabel}
          title={formatRoutePath(node.fullKey)}
        >
          {node.label}
        </div>
      )}
      {hasChildren ? (
        <ul className={styles.routesChildren} role="group">
          {node.children.map((child) => (
            <RouteTreeNode
              key={child.fullKey}
              node={child}
              activeRoute={activeRoute}
              onSelectRoute={onSelectRoute}
              routesDisabled={routesDisabled}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
};

const RouteTreeNode = memo(RouteTreeNodeComponent);

const RouteTreePanelComponent = ({
  routeTree,
  activeRoute,
  onSelectRoute,
  onCreateRoute,
  createDisabled,
  routesDisabled,
}) => {
  return (
    <section className={styles.routesSection} aria-labelledby="website-editor-routes">
      <header className={styles.routesHeader}>
        <span id="website-editor-routes" className={styles.routesTitle}>
          Routes
        </span>
        <Button
          type="button"
          variant="outline"
          onClick={onCreateRoute}
          disabled={createDisabled}
          className={styles.routesCreateButton}
        >
          Create page
        </Button>
      </header>
      <nav className={styles.routesTreeWrapper} aria-label="Website routes">
        <ul className={styles.routesTree} role="tree">
          <li className={styles.routesRoot} role="treeitem" aria-expanded="true">
            <div className={styles.routesRootLabel}>Website</div>
            <ul className={styles.routesChildren} role="group">
              {routeTree.map((node) => (
                <RouteTreeNode
                  key={node.fullKey}
                  node={node}
                  activeRoute={activeRoute}
                  onSelectRoute={onSelectRoute}
                  routesDisabled={routesDisabled}
                />
              ))}
            </ul>
          </li>
        </ul>
      </nav>
    </section>
  );
};

const RouteTreePanel = memo(RouteTreePanelComponent);

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

  const stableRouteOptions = useStableArray(routeOptions);

  const routeTree = useMemo(
    () => buildRouteTree(stableRouteOptions),
    [stableRouteOptions]
  );

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
      const draft = payload?.data ?? payload;
      if (!draft) return;
      setDraftsByRoute((previous) => ({
        ...previous,
        [routeKey]: draft,
      }));
    },
    [routeKey]
  );

  const handlePublish = useCallback(
    async (payload) => {
      const normalized = resolveNormalizedDraft(payload);
      if (!normalized) return;
      setDraftsByRoute((previous) => {
        const draft = payload?.data ?? payload ?? normalized;
        return {
          ...previous,
          [routeKey]: draft,
        };
      });
      await saveWebsite(normalized, routeKey);
    },
    [resolveNormalizedDraft, routeKey, saveWebsite]
  );

  const handleManualSave = useCallback(() => {
    const draft = draftsByRoute[routeKey] ?? currentDraft;
    if (!draft) return;
    void saveWebsite(draft, routeKey);
  }, [currentDraft, draftsByRoute, routeKey, saveWebsite]);

  const handleRouteSelect = useCallback(
    (nextKey) => {
      const normalized =
        typeof nextKey === "string" ? nextKey.trim() : "";
      if (!normalized || normalized === routeKey) return;
      setRouteKey(normalized);
    },
    [routeKey]
  );

  const handleCreatePage = useCallback(() => {
    const input =
      typeof window !== "undefined"
        ? window.prompt(
            "Enter a URL slug for the new page (e.g. schedule or schedule/sessions)"
          )
        : null;
    if (input == null) return;
    const slug = slugifyRouteKey(input);
    if (!slug) {
      toast.error("Page key must include letters or numbers.");
      return;
    }
    if (stableRouteOptions.includes(slug)) {
      toast.error("That page already exists.");
      return;
    }
    handleRouteSelect(slug);
  }, [handleRouteSelect, stableRouteOptions]);

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

  const routesDisabled = websiteLoading && !websitePage;

  const puckOverrides = useMemo(
    () => ({
      headerActions: HeaderActionsOverride,
      fields: ({ children }) => (
        <Fragment>
          {children}
          <RouteTreePanel
            routeTree={routeTree}
            activeRoute={routeKey}
            onSelectRoute={handleRouteSelect}
            onCreateRoute={handleCreatePage}
            createDisabled={saving}
            routesDisabled={routesDisabled}
          />
        </Fragment>
      ),
    }),
    [
      HeaderActionsOverride,
      routeTree,
      routeKey,
      handleRouteSelect,
      handleCreatePage,
      saving,
      routesDisabled,
    ]
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
