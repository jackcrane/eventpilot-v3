import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const EMPTY = [];

const reindexColumns = (columns = []) =>
  columns.map((column, index) => ({
    ...column,
    order: index + 1,
  }));

const serializeColumns = (columns = []) =>
  columns.map(({ id, show, order }) => ({
    id,
    show: Boolean(show),
    order: Number.isFinite(order) ? order : undefined,
  }));

const areColumnsEqual = (left, right) => {
  if (left === right) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    const a = left[i];
    const b = right[i];
    if (!a || !b) return false;
    if (a.id !== b.id) return false;
    if (Boolean(a.show) !== Boolean(b.show)) return false;
    if (a.order !== b.order) return false;
  }
  return true;
};

const loadStoredConfig = (storageKey) => {
  if (!storageKey || typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.filter((item) => item && typeof item.id === "string");
  } catch (error) {
    console.warn("Failed to load column config", error);
  }
  return EMPTY;
};

const applyStoredConfig = (columns, stored) => {
  if (!Array.isArray(columns) || !columns.length) return columns || EMPTY;
  if (!Array.isArray(stored) || !stored.length)
    return reindexColumns(
      columns.map((column, index) => ({
        ...column,
        show: column.show ?? true,
        order: Number.isFinite(column.order) ? column.order : index + 1,
      }))
    );

  const storedById = new Map();
  stored.forEach((item, index) => {
    if (!item || typeof item.id !== "string") return;
    const order = Number.isFinite(item.order) ? item.order : index + 1;
    storedById.set(item.id, {
      show: typeof item.show === "boolean" ? item.show : undefined,
      order,
    });
  });

  const withPrefs = columns.map((column, index) => {
    const prefs = storedById.get(column.id);
    const order = Number.isFinite(prefs?.order)
      ? prefs.order
      : Number.isFinite(column.order)
      ? column.order
      : index + 1;
    const show =
      typeof prefs?.show === "boolean"
        ? prefs.show
        : typeof column.show === "boolean"
        ? column.show
        : true;
    return { ...column, order, show };
  });

  const seen = new Set();
  const prioritized = withPrefs
    .filter((column) => {
      if (seen.has(column.id)) return false;
      seen.add(column.id);
      return true;
    })
    .sort((a, b) => {
      const prefsA = storedById.get(a.id);
      const prefsB = storedById.get(b.id);
      const orderA = Number.isFinite(prefsA?.order) ? prefsA.order : a.order;
      const orderB = Number.isFinite(prefsB?.order) ? prefsB.order : b.order;
      return orderA - orderB;
    });

  return reindexColumns(prioritized);
};

export const useColumnConfig = ({ storageKey, columns }) => {
  const storedRef = useRef(loadStoredConfig(storageKey));

  const [columnConfig, setColumnConfigState] = useState(() =>
    applyStoredConfig(columns, storedRef.current)
  );

  useEffect(() => {
    const stored = loadStoredConfig(storageKey);
    storedRef.current = stored;
    const base = applyStoredConfig(columns, stored);
    setColumnConfigState((current) =>
      areColumnsEqual(current, base) ? current : base
    );
  }, [columns, storageKey]);

  const persist = useCallback(
    (next) => {
      if (!storageKey || typeof window === "undefined") return;
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify(serializeColumns(next))
        );
      } catch (error) {
        console.warn("Failed to persist column config", error);
      }
    },
    [storageKey]
  );

  const setColumnConfig = useCallback(
    (updater) => {
      setColumnConfigState((current) => {
        const resolved =
          typeof updater === "function" ? updater(current) : updater ?? current;
        const reindexed = reindexColumns(
          Array.isArray(resolved) ? resolved : current
        );
        if (areColumnsEqual(current, reindexed)) return current;
        persist(reindexed);
        return reindexed;
      });
    },
    [persist]
  );

  const visibleColumns = useMemo(
    () =>
      columnConfig
        .filter((column) => column.show)
        .sort((a, b) => a.order - b.order)
        .map((column) => ({ ...column })),
    [columnConfig]
  );

  return { columnConfig, setColumnConfig, visibleColumns };
};
