import { useMemo } from "react";

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

const sortIndicator = (active, direction) => (
  <span style={{ marginLeft: 6, opacity: 0.7 }}>
    {active ? (direction === "asc" ? "▲" : "▼") : "↕"}
  </span>
);

export const useCrmTableSorting = ({ columns = [], orderBy, order, onSetOrder }) => {
  const controlled = !!orderBy && !!order && typeof onSetOrder === "function";

  return useMemo(() => {
    if (!controlled) return columns;
    return columns.map((column) => {
      if (!canServerSort(column)) return { ...column, sortable: false };
      const accessor = column.accessor;
      const isActive = accessor === orderBy;
      const nextOrder = isActive && order === "asc" ? "desc" : "asc";
      const handleClick = (event) => {
        event?.preventDefault?.();
        onSetOrder(accessor, nextOrder);
      };
      return {
        ...column,
        sortable: false,
        label: (
          <span
            role="button"
            onClick={handleClick}
            style={{ cursor: "pointer", userSelect: "none" }}
            title={isActive ? `Sorted ${order}` : "Click to sort"}
          >
            {column.label}
            {sortIndicator(isActive, order)}
          </span>
        ),
      };
    });
  }, [columns, controlled, orderBy, order, onSetOrder]);
};
