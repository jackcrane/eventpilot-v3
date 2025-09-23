import React from "react";
import { Button } from "tabler-react-2";

export const CrmTablePaginationControls = ({
  total,
  startIdx,
  shownEndIdx,
  pageCount,
  currentPage,
  effectiveSize,
  controlled,
  setPage,
  setPageSize,
  canGoPrev,
  canGoNext,
}) => {
  if (pageCount <= 1) return null;

  return (
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
          onChange={(event) => {
            const next = parseInt(event.target.value, 10);
            if (Number.isFinite(next)) setPageSize(next);
          }}
          style={{ fontSize: 12, padding: "2px 6px" }}
        >
          {[10, 25, 50, 100].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <Button size="sm" disabled={!canGoPrev} onClick={() => setPage(currentPage - 1)}>
          Prev
        </Button>
        <div style={{ minWidth: 80, textAlign: "center", fontSize: 12 }}>
          Page {currentPage} of {pageCount}
        </div>
        <Button size="sm" disabled={!canGoNext} onClick={() => setPage(currentPage + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
};
