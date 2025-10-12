import { Fragment, useCallback, useMemo } from "react";
import {
  DEFAULT_WEBSITE_DATA,
  createWebsiteEditorConfig,
} from "../WebsiteEditor/websiteConfig";

const isPlainObject = (value) =>
  !!value && typeof value === "object" && !Array.isArray(value);

const ensureStringId = (value, fallback) => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (value && typeof value.toString === "function") {
    const candidate = value.toString();
    if (candidate && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return fallback;
};

const normalizeBlocks = (blocks = [], fallbackPrefix = "block") =>
  (Array.isArray(blocks) ? blocks : [])
    .map((block, index) => {
      if (!isPlainObject(block)) return null;
      const id = ensureStringId(block.id, `${fallbackPrefix}-${index}`);
      const type =
        typeof block.type === "string" && block.type.trim().length > 0
          ? block.type.trim()
          : null;
      if (!type) return null;
      const props = isPlainObject(block.props) ? block.props : {};
      return {
        id,
        type,
        props,
      };
    })
    .filter(Boolean);

const normalizeZones = (zones = {}) => {
  if (!isPlainObject(zones)) return {};
  return Object.fromEntries(
    Object.entries(zones).map(([zoneId, zoneContent]) => [
      zoneId,
      normalizeBlocks(zoneContent, zoneId),
    ])
  );
};

const normalizeWebsiteData = (data) => {
  const base = Array.isArray(data)
    ? { content: data }
    : isPlainObject(data)
      ? data
      : {};
  const contentSource = Array.isArray(base.content)
    ? base.content
    : Array.isArray(base.blocks)
      ? base.blocks
      : [];
  return {
    content: normalizeBlocks(contentSource, "content"),
    root: isPlainObject(base.root) ? base.root : null,
    zones: normalizeZones(base.zones),
  };
};

const resolveSlotFields = (config) => {
  const slotMap = {};
  Object.entries(config.components || {}).forEach(([type, component]) => {
    const fields = component?.fields || {};
    const slotFields = Object.entries(fields)
      .filter(([, fieldConfig]) => fieldConfig?.type === "slot")
      .map(([fieldName]) => fieldName);
    slotMap[type] = slotFields;
  });
  return slotMap;
};

const resolveZoneBlocks = (block, slotName, zones) => {
  if (!block || !zones) return [];
  const props = block.props || {};
  const fromProps =
    typeof props[slotName] === "string" && zones[props[slotName]]
      ? props[slotName]
      : null;
  if (fromProps) {
    return zones[fromProps] || [];
  }
  const fallbackKey = `${block.id}:${slotName}`;
  if (zones[fallbackKey]) {
    return zones[fallbackKey] || [];
  }
  if (Array.isArray(props[slotName])) {
    return normalizeBlocks(props[slotName], `${block.id}:${slotName}`);
  }
  return [];
};

export const WebsiteRenderer = ({ data }) => {
  const normalized = useMemo(
    () => normalizeWebsiteData(data ?? DEFAULT_WEBSITE_DATA),
    [data]
  );

  const config = useMemo(() => createWebsiteEditorConfig(), []);
  const slotFieldsByType = useMemo(
    () => resolveSlotFields(config),
    [config]
  );
  const components = config.components || {};

  const renderBlocks = useCallback(
    (blocks) =>
      blocks.map((block) => {
        const componentConfig = components[block.type];
        if (!componentConfig || typeof componentConfig.render !== "function") {
          return null;
        }

      const slotFields = slotFieldsByType[block.type] || [];
      const props = { ...block.props };

      slotFields.forEach((slotName) => {
        const zoneBlocks = resolveZoneBlocks(block, slotName, normalized.zones);
        if (zoneBlocks.length > 0) {
          props[slotName] = ({ style }) => (
            <div style={style}>{renderBlocks(zoneBlocks)}</div>
          );
        } else {
          delete props[slotName];
        }
        });

        return <Fragment key={block.id}>{componentConfig.render(props)}</Fragment>;
      }),
    [components, normalized, slotFieldsByType]
  );

  const renderedBlocks = useMemo(
    () => renderBlocks(normalized.content),
    [normalized.content, renderBlocks]
  );

  return <div>{renderedBlocks}</div>;
};
