import React, { useMemo } from "react";
import { Table } from "tabler-react-2";
import { useCrmTablePagination } from "../../hooks/useCrmTablePagination";
import { useCrmTableSelection } from "../../hooks/useCrmTableSelection";
import { useCrmTableSorting } from "../../hooks/useCrmTableSorting";
import { CrmTablePaginationControls } from "./CrmTablePaginationControls";

export const CrmPersonsTable = ({
  data = [],
  columns = [],
  pageSize = 10,
  selectedIds,
  onSelectionChange,
  page,
  size,
  totalRows,
  onSetPage,
  onSetSize,
  orderBy,
  order,
  onSetOrder,
}) => {
  const pagination = useCrmTablePagination({
    data,
    pageSize,
    page,
    size,
    totalRows,
    onSetPage,
    onSetSize,
  });

  const sortedColumns = useCrmTableSorting({
    columns,
    orderBy,
    order,
    onSetOrder,
  });

  const { selectionColumn } = useCrmTableSelection({
    rows: pagination.pageRows,
    controlledSelectedIds: selectedIds,
    onSelectionChange,
  });

  const enhancedColumns = useMemo(() => {
    if (!pagination.pageRows?.length) return [];
    return [selectionColumn, ...sortedColumns];
  }, [selectionColumn, sortedColumns, pagination.pageRows]);

  if (!pagination.pageRows?.length) return null;

  return (
    <div className="card">
      <div style={{ overflowX: "auto" }}>
        <Table
          className="card"
          showPagination={false}
          columns={enhancedColumns}
          data={pagination.pageRows}
        />
      </div>
      <CrmTablePaginationControls
        total={pagination.total}
        startIdx={pagination.startIdx}
        shownEndIdx={pagination.shownEndIdx}
        pageCount={pagination.pageCount}
        currentPage={pagination.currentPage}
        effectiveSize={pagination.effectiveSize}
        setPage={pagination.setPage}
        setPageSize={pagination.setPageSize}
        canGoPrev={pagination.canGoPrev}
        canGoNext={pagination.canGoNext}
      />
    </div>
  );
};
