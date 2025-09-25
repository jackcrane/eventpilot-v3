import { useCallback, useMemo, useState } from "react";

const ALLOWED_SORT_KEYS = new Set([
  "name",
  "createdAt",
  "updatedAt",
  "source",
]);

const canServerSort = (column) => {
  if (column?.sortable === false) return false;
  const accessor = column?.accessor;
  if (typeof accessor !== "string") return false;
  if (ALLOWED_SORT_KEYS.has(accessor)) return true;
  return accessor.startsWith?.("fields.");
};

const defaultSortFn = (a, b) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
};

const getValueByAccessor = (row, accessor) => {
  if (!accessor) return undefined;
  return accessor.split(".").reduce((acc, key) => {
    if (acc == null) return undefined;
    return acc[key];
  }, row);
};

const getColumnId = (column, index) =>
  column?.columnId ?? column?.accessor ?? column?.id ?? `column-${index}`;

export const useCrmTableSorting = ({
  columns = [],
  orderBy,
  order,
  onSetOrder,
}) => {
  const controlled =
    !!orderBy && !!order && typeof onSetOrder === "function";
  const [localSorting, setLocalSorting] = useState([]);

  const sorting = useMemo(() => {
    if (controlled) {
      if (!orderBy) return [];
      return [
        {
          id: orderBy,
          desc: String(order).toLowerCase() === "desc",
        },
      ];
    }
    return localSorting;
  }, [controlled, orderBy, order, localSorting]);

  const onSortingChange = useCallback(
    (updater) => {
      const resolve = (current) =>
        typeof updater === "function" ? updater(current) : updater;

      if (controlled) {
        const next = resolve(sorting);
        if (!Array.isArray(next) || next.length === 0) {
          return;
        }

        const { id, desc } = next[0] ?? {};
        if (!id) return;

        const normalizedOrder = desc ? "desc" : "asc";
        if (id === orderBy && normalizedOrder === order) return;

        onSetOrder(id, normalizedOrder);
        return;
      }

      setLocalSorting(resolve(localSorting));
    },
    [controlled, sorting, orderBy, order, onSetOrder, localSorting]
  );

  const isColumnSortable = useCallback(
    (column, index) => {
      if (controlled) return canServerSort(column);
      return column?.sortable !== false && typeof getColumnId(column, index) === "string";
    },
    [controlled]
  );

  const applySorting = useCallback(
    (rows) => {
      if (controlled) return rows;
      if (!Array.isArray(rows) || rows.length <= 1) return rows;
      if (!localSorting.length) return rows;

      const { id, desc } = localSorting[0];
      const columnIndex = columns.findIndex((col, idx) => getColumnId(col, idx) === id);
      if (columnIndex === -1) return rows;

      const column = columns[columnIndex];
      const accessor = column?.accessor;
      if (!accessor) return rows;

      const compare = typeof column?.sortFn === "function" ? column.sortFn : defaultSortFn;
      const sorted = [...rows].sort((a, b) => {
        const result = compare(
          getValueByAccessor(a, accessor),
          getValueByAccessor(b, accessor)
        );
        return desc ? -result : result;
      });
      return sorted;
    },
    [controlled, localSorting, columns]
  );

  return {
    sorting,
    onSortingChange,
    isColumnSortable,
    applySorting,
    controlled,
  };
};

export const getCrmColumnId = getColumnId;
export const getCrmValueByAccessor = getValueByAccessor;
export const crmCanServerSort = canServerSort;
