import { useMemo, useState } from "react";

export const useCrmTablePagination = ({
  data = [],
  pageSize = 10,
  page,
  size,
  totalRows,
  onSetPage,
  onSetSize,
}) => {
  const [localPage, setLocalPage] = useState(1);
  const [localSize, setLocalSize] = useState(pageSize);

  const controlled = Number.isFinite(page) && Number.isFinite(size);
  const effectiveSize = controlled ? size : localSize;
  const total = controlled ? controlledTotal(totalRows) : data.length;
  const pageCount = Math.max(1, Math.ceil(total / Math.max(effectiveSize, 1)));
  const currentPage = controlled
    ? Math.max(1, Math.min(page, pageCount))
    : Math.min(localPage, pageCount);
  const startIdx = (currentPage - 1) * Math.max(effectiveSize, 1);

  const pageRows = useMemo(() => {
    if (controlled) return data || [];
    const endIdx = Math.min(startIdx + effectiveSize, total);
    return data.slice(startIdx, endIdx);
  }, [controlled, data, startIdx, effectiveSize, total]);

  const shownEndIdx = startIdx + pageRows.length;

  const setPageHandler = (nextPage) => {
    if (controlled) onSetPage && onSetPage(nextPage);
    else setLocalPage(Math.max(1, Math.min(nextPage, pageCount)));
  };

  const setSizeHandler = (nextSize) => {
    if (controlled) onSetSize && onSetSize(nextSize);
    else {
      setLocalSize(nextSize);
      setLocalPage(1);
    }
  };

  return {
    pageRows,
    total,
    startIdx,
    shownEndIdx,
    pageCount,
    currentPage,
    effectiveSize,
    controlled,
    setPage: setPageHandler,
    setPageSize: setSizeHandler,
    canGoPrev: currentPage > 1,
    canGoNext: currentPage < pageCount,
  };
};

const controlledTotal = (value) => {
  if (Number.isFinite(value)) return value;
  return 0;
};
