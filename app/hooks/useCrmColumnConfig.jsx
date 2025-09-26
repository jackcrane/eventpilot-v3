import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createBaseColumns,
  buildDynamicColumn,
  buildParticipantFieldColumn,
  buildVolunteerFieldColumn,
  participantFieldColumnId,
  volunteerFieldColumnId,
} from "../util/crm/createColumns";

const PARTICIPANT_PREFIX = "participant-field-";
const VOLUNTEER_PREFIX = "volunteer-field-";
const STORAGE_PREFIX = "crm-column-config";

const EMPTY_CONFIG = [];

const reindexColumns = (columns = []) =>
  columns.map((column, index) => ({ ...column, order: index + 1 }));

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

const loadStoredConfig = (key) => {
  if (!key) return EMPTY_CONFIG;
  if (typeof window === "undefined") return EMPTY_CONFIG;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return EMPTY_CONFIG;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_CONFIG;
    return parsed.filter((item) => item && typeof item.id === "string");
  } catch (error) {
    console.warn("Failed to load CRM column config", error);
  }
  return EMPTY_CONFIG;
};

const applyStoredConfig = (columns, stored) => {
  if (!Array.isArray(columns) || !columns.length) return columns;
  if (!Array.isArray(stored) || !stored.length) return reindexColumns(columns);

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
    const nextOrder = Number.isFinite(prefs?.order)
      ? prefs.order
      : column.order ?? index + 1;
    const nextShow =
      typeof prefs?.show === "boolean" ? prefs.show : column.show ?? true;
    return { ...column, order: nextOrder, show: nextShow };
  });

  return reindexColumns(
    withPrefs.sort((a, b) => {
      const prefsA = storedById.get(a.id);
      const prefsB = storedById.get(b.id);
      const orderA = Number.isFinite(prefsA?.order) ? prefsA.order : a.order;
      const orderB = Number.isFinite(prefsB?.order) ? prefsB.order : b.order;
      return orderA - orderB;
    })
  );
};

export const useCrmColumnConfig = ({
  eventId,
  crmFields = [],
  onViewPerson,
  participantFieldLabels = [],
  volunteerFieldLabels = [],
}) => {
  const storageKey = useMemo(
    () => (eventId ? `${STORAGE_PREFIX}:${eventId}` : null),
    [eventId]
  );

  const storedRef = useRef(loadStoredConfig(storageKey));

  const [columnConfig, setColumnConfigState] = useState(() =>
    applyStoredConfig(createBaseColumns(onViewPerson), storedRef.current)
  );

  useEffect(() => {
    const stored = loadStoredConfig(storageKey);
    storedRef.current = stored;
    const base = applyStoredConfig(createBaseColumns(onViewPerson), stored);
    setColumnConfigState((current) =>
      areColumnsEqual(current, base) ? current : base
    );
  }, [onViewPerson, storageKey]);

  const persistColumns = useCallback(
    (columns) => {
      const serialized = serializeColumns(columns);
      storedRef.current = serialized;
      if (!storageKey || typeof window === "undefined") return;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(serialized));
      } catch (error) {
        console.warn("Failed to persist CRM column config", error);
      }
    },
    [storageKey]
  );

  const setColumnConfig = useCallback(
    (updater) => {
      setColumnConfigState((current) => {
        const next =
          typeof updater === "function" ? updater(current) : updater ?? current;
        const reindexed = reindexColumns(Array.isArray(next) ? next : current);
        if (areColumnsEqual(current, reindexed)) return current;
        persistColumns(reindexed);
        return reindexed;
      });
    },
    [persistColumns]
  );

  useEffect(() => {
    if (!crmFields?.length) return;
    setColumnConfig((current) => {
      if (current.some((column) => column.id.startsWith("field-"))) return current;
      const idx = current.findIndex((column) => column.id === "phones");
      const dynamic = crmFields.map((field) => buildDynamicColumn(field));
      const next = [
        ...current.slice(0, idx + 1),
        ...dynamic,
        ...current.slice(idx + 1),
      ];
      return applyStoredConfig(next, storedRef.current);
    });
  }, [crmFields, setColumnConfig]);

  useEffect(() => {
    setColumnConfig((current) => {
      const hasExistingParticipantColumns = current.some((column) =>
        column.id.startsWith(PARTICIPANT_PREFIX)
      );

      if (!participantFieldLabels?.length && !hasExistingParticipantColumns) {
        return current;
      }

      const allowedIds = new Set(
        (participantFieldLabels || []).map((label) =>
          participantFieldColumnId(label)
        )
      );

      let next = current.filter(
        (column) =>
          !column.id.startsWith(PARTICIPANT_PREFIX) || allowedIds.has(column.id)
      );

      participantFieldLabels.forEach((label) => {
        const id = participantFieldColumnId(label);
        if (next.some((column) => column.id === id)) return;
        const column = buildParticipantFieldColumn(label);
        next = [
          ...next,
          {
            ...column,
            show: column.show ?? false,
            order: next.length + 1,
          },
        ];
      });

      return applyStoredConfig(next, storedRef.current);
    });
  }, [participantFieldLabels, setColumnConfig]);

  useEffect(() => {
    setColumnConfig((current) => {
      const hasExistingVolunteerColumns = current.some((column) =>
        column.id.startsWith(VOLUNTEER_PREFIX)
      );

      if (!volunteerFieldLabels?.length && !hasExistingVolunteerColumns) {
        return current;
      }

      const allowedIds = new Set(
        (volunteerFieldLabels || []).map((label) =>
          volunteerFieldColumnId(label)
        )
      );

      let next = current.filter(
        (column) =>
          !column.id.startsWith(VOLUNTEER_PREFIX) || allowedIds.has(column.id)
      );

      volunteerFieldLabels.forEach((label) => {
        const id = volunteerFieldColumnId(label);
        if (next.some((column) => column.id === id)) return;
        const column = buildVolunteerFieldColumn(label);
        next = [
          ...next,
          {
            ...column,
            show: column.show ?? false,
            order: next.length + 1,
          },
        ];
      });

      return applyStoredConfig(next, storedRef.current);
    });
  }, [volunteerFieldLabels, setColumnConfig]);

  const visibleColumns = useMemo(
    () =>
      columnConfig
        .filter((column) => column.show)
        .sort((a, b) => a.order - b.order)
        .map(({ show, order, ...rest }) => rest),
    [columnConfig]
  );

  return { columnConfig, setColumnConfig, visibleColumns };
};
