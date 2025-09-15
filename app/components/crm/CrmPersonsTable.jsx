import React, { useEffect, useMemo, useState } from "react";
import { Table, Button, Checkbox } from "tabler-react-2";

// Adds row selection checkboxes with a header "select all" that targets
// only the current page. Selection persists across pagination.
export const CrmPersonsTable = ({
  data = [],
  columns = [],
  pageSize = 10,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
  // Controlled pagination props (server-side)
  page: controlledPage,
  size: controlledSize,
  totalRows: controlledTotal,
  onSetPage,
  onSetSize,
}) => {
  const [page, setPage] = useState(1);
  const [localSize, setLocalSize] = useState(pageSize);

  // Internal selection if not controlled
  const [uncontrolledSelected, setUncontrolledSelected] = useState(new Set());
  const selected = useMemo(() => {
    if (Array.isArray(controlledSelectedIds))
      return new Set(controlledSelectedIds);
    return uncontrolledSelected;
  }, [controlledSelectedIds, uncontrolledSelected]);

  const controlled =
    Number.isFinite(controlledPage) && Number.isFinite(controlledSize);

  const effectiveSize = controlled ? controlledSize : localSize;
  const total = controlled ? controlledTotal ?? 0 : data?.length || 0;
  const pageCount = Math.max(1, Math.ceil(total / (effectiveSize || 1)));
  const currentPage = controlled
    ? Math.max(1, Math.min(controlledPage, pageCount))
    : Math.min(page, pageCount);
  const startIdx = (currentPage - 1) * (effectiveSize || 1);

  const pageRows = useMemo(() => {
    if (controlled) return data || [];
    const endIdx = Math.min(startIdx + (effectiveSize || 0), total);
    return data.slice(startIdx, endIdx);
  }, [controlled, data, startIdx, effectiveSize, total]);

  const shownEndIdx = startIdx + (pageRows?.length || 0);

  useEffect(() => {
    if (!controlled && page > pageCount) setPage(pageCount);
  }, [controlled, page, pageCount]);

  const commitSelection = (nextSet) => {
    if (onSelectionChange) {
      onSelectionChange(Array.from(nextSet));
    } else {
      setUncontrolledSelected(nextSet);
    }
  };

  const toggleOne = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    commitSelection(next);
  };

  const pageIds = useMemo(
    () => pageRows.map((r) => r.id).filter(Boolean),
    [pageRows]
  );
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const noneOnPageSelected = pageIds.every((id) => !selected.has(id));
  const someOnPageSelected = !noneOnPageSelected && !allOnPageSelected;

  const toggleSelectAllOnPage = () => {
    const next = new Set(selected);
    if (allOnPageSelected) {
      pageIds.forEach((id) => next.delete(id));
    } else {
      pageIds.forEach((id) => next.add(id));
    }
    commitSelection(next);
  };

  const selectionColumn = useMemo(
    () => ({
      label: (
        <span style={{ display: "block", height: 0 }}>
          <Checkbox
            label=""
            value={allOnPageSelected}
            onChange={toggleSelectAllOnPage}
            className="mb-0"
          />
        </span>
      ),
      accessor: "id",
      sortable: false,
      render: (id) => (
        <Checkbox
          label=""
          value={selected.has(id)}
          onChange={() => toggleOne(id)}
          className="mb-0"
        />
      ),
    }),
    [allOnPageSelected, selected]
  );

  const enhancedColumns = useMemo(
    () => [selectionColumn, ...columns],
    [selectionColumn, columns]
  );

  if (!data || data.length === 0) return null;

  return (
    <div className="card">
      <div style={{ overflowX: "auto" }}>
        <Table
          className="card"
          showPagination={false}
          columns={enhancedColumns}
          data={pageRows}
        />
      </div>
      {pageCount > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.5rem 0.75rem",
          }}
        >
          <div style={{ fontSize: 12, color: "#6c757d" }}>
            Showing {total === 0 ? 0 : startIdx + 1}-{shownEndIdx} of {total}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#6c757d" }}>Rows per page:</div>
            <select
              value={effectiveSize}
              onChange={(e) => {
                const next = parseInt(e.target.value, 10);
                if (controlled) onSetSize && onSetSize(next);
                else {
                  // local-only
                  setLocalSize(next);
                  setPage(1);
                }
              }}
              style={{ fontSize: 12, padding: "2px 6px" }}
            >
              {[10, 25, 50, 100].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={currentPage <= 1}
              onClick={() =>
                controlled
                  ? onSetPage && onSetPage(currentPage - 1)
                  : setPage((p) => Math.max(1, p - 1))
              }
            >
              Prev
            </Button>
            <div style={{ minWidth: 80, textAlign: "center", fontSize: 12 }}>
              Page {currentPage} of {pageCount}
            </div>
            <Button
              size="sm"
              disabled={currentPage >= pageCount}
              onClick={() =>
                controlled
                  ? onSetPage && onSetPage(currentPage + 1)
                  : setPage((p) => Math.min(pageCount, p + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
