const MAX_ROUTE_KEY_LENGTH = 100;
const DEFAULT_ROUTE_KEY = "home";

const NESTED_DRAFT_KEYS = [
  "data",
  "draft",
  "page",
  "layout",
  "payload",
  "value",
  "state",
  "contentState",
];

const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sanitizeJson = (value) => {
  if (value == null) return null;
  return JSON.parse(JSON.stringify(value));
};

const sanitizeRouteKey = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_ROUTE_KEY_LENGTH);
};

export const normalizeRouteKeyInput = (value, fallback = DEFAULT_ROUTE_KEY) => {
  const sanitized = sanitizeRouteKey(value);
  return sanitized ?? fallback;
};

const extractContent = (draft) => {
  if (Array.isArray(draft.content)) return draft.content;
  if (Array.isArray(draft.blocks)) return draft.blocks;
  if (Array.isArray(draft.sections)) return draft.sections;
  return [];
};

const extractRoot = (draft) => {
  if (isPlainObject(draft.root)) return draft.root;
  if (isPlainObject(draft.pageRoot)) return draft.pageRoot;
  return {};
};

const extractZones = (draft) => {
  if (isPlainObject(draft.zones)) return draft.zones;
  if (isPlainObject(draft.areas)) return draft.areas;
  return {};
};

const mergeDraftComponents = (draft) => {
  const {
    content: _content,
    blocks: _blocks,
    sections: _sections,
    root: _root,
    pageRoot: _pageRoot,
    zones: _zones,
    areas: _areas,
    ...rest
  } = draft;

  return {
    ...rest,
    content: extractContent(draft),
    root: extractRoot(draft),
    zones: extractZones(draft),
  };
};

const resolveDraft = (raw) => {
  if (raw == null) return null;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return resolveDraft(parsed);
    } catch {
      return null;
    }
  }

  if (Array.isArray(raw)) {
    return {
      content: raw,
      root: {},
      zones: {},
    };
  }

  if (!isPlainObject(raw)) return null;

  for (const key of NESTED_DRAFT_KEYS) {
    if (raw[key] != null) {
      return resolveDraft(raw[key]);
    }
  }

  return mergeDraftComponents(raw);
};

export const sanitizeWebsiteDraft = (draft) => {
  const resolved = resolveDraft(draft);
  if (!resolved) {
    return {
      content: [],
      root: {},
      zones: {},
    };
  }
  return sanitizeJson(resolved);
};

export const normalizeWebsitePages = (rawPages) => {
  const normalized = {};

  const assign = (key, value) => {
    const routeKey = sanitizeRouteKey(key);
    if (!routeKey) return;
    normalized[routeKey] = sanitizeWebsiteDraft(value);
  };

  if (rawPages == null) {
    return normalized;
  }

  if (typeof rawPages === "string") {
    try {
      const parsed = JSON.parse(rawPages);
      return normalizeWebsitePages(parsed);
    } catch {
      return normalized;
    }
  }

  if (Array.isArray(rawPages)) {
    rawPages.forEach((entry, index) => {
      if (entry == null) return;
      if (!isPlainObject(entry)) {
        const fallbackKey = `page-${index + 1}`;
        assign(fallbackKey, entry);
        return;
      }
      const explicitKey =
        sanitizeRouteKey(entry.routeKey) ??
        sanitizeRouteKey(entry.slug) ??
        sanitizeRouteKey(entry.key);
      if (explicitKey) {
        assign(explicitKey, entry);
      }
    });
    return normalized;
  }

  if (isPlainObject(rawPages)) {
    Object.entries(rawPages).forEach(([key, value]) => {
      if (value == null) return;
      if (isPlainObject(value)) {
        const explicitKey = sanitizeRouteKey(value.routeKey);
        if (explicitKey) {
          assign(explicitKey, value);
          return;
        }
      }
      assign(key, value);
    });
    return normalized;
  }

  return normalized;
};

export const listAvailableRouteKeys = (pages, extraKey) => {
  const keys = new Set([DEFAULT_ROUTE_KEY]);
  Object.keys(pages || {}).forEach((key) => {
    const sanitized = sanitizeRouteKey(key);
    if (sanitized) {
      keys.add(sanitized);
    }
  });
  const sanitizedExtra = sanitizeRouteKey(extraKey);
  if (sanitizedExtra) {
    keys.add(sanitizedExtra);
  }
  return Array.from(keys);
};

export const extractWebsitePage = (rawPages, requestedRouteKey) => {
  const pages = normalizeWebsitePages(rawPages);
  const routeKey = normalizeRouteKeyInput(requestedRouteKey);
  const hasPage = Object.prototype.hasOwnProperty.call(pages, routeKey);
  const pageData = hasPage ? pages[routeKey] : null;
  return {
    pages,
    routeKey,
    pageData,
  };
};

export const upsertWebsitePage = (rawPages, routeKey, draft) => {
  const pages = normalizeWebsitePages(rawPages);
  const normalizedRouteKey = normalizeRouteKeyInput(routeKey);
  const sanitizedDraft = sanitizeWebsiteDraft(draft);
  pages[normalizedRouteKey] = sanitizedDraft;
  return {
    pages,
    routeKey: normalizedRouteKey,
    draft: sanitizedDraft,
  };
};
