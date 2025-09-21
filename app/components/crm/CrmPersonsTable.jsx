import React, { useMemo } from "react";
import { TableV2 } from "tabler-react-2/dist/table-v2";
import { useCrmTablePagination } from "../../hooks/useCrmTablePagination";
import { useCrmTableSelection } from "../../hooks/useCrmTableSelection";
import {
  useCrmTableSorting,
  getCrmColumnId,
  getCrmValueByAccessor,
} from "../../hooks/useCrmTableSorting";

export const CrmPersonsTable = (props) => {
  const {
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
  } = props;

  console.log("[CrmPersonsTable] props:", {
    page,
    size,
    totalRows,
    dataLength: data.length,
    orderBy,
    order,
  });

  const normalizedColumns = useMemo(
    () =>
      columns.map((column, index) => ({
        ...column,
        columnId: getCrmColumnId(column, index),
      })),
    [columns]
  );

  const { sorting, onSortingChange, isColumnSortable, applySorting } =
    useCrmTableSorting({
      columns: normalizedColumns,
      orderBy,
      order,
      onSetOrder,
    });

  const sortedData = useMemo(
    () => applySorting(data || []),
    [applySorting, data]
  );

  const pagination = useCrmTablePagination({
    data: sortedData,
    pageSize,
    page,
    size,
    totalRows,
    onSetPage,
    onSetSize,
  });

  console.log("[CrmPersonsTable] pagination state:", pagination);

  const { selectionColumn, rowSelection, onRowSelectionChange } =
    useCrmTableSelection({
      rows: pagination.pageRows,
      controlledSelectedIds: selectedIds,
      onSelectionChange,
    });

  const tableColumns = useMemo(() => {
    const mapped = normalizedColumns.map((column, index) => {
      const headerContent = (
        <span className="d-inline-flex align-items-center gap-2">
          {column.icon ? <span>{column.icon}</span> : null}
          <span>{column.label}</span>
        </span>
      );

      const accessorFn = column.accessor
        ? (row) => getCrmValueByAccessor(row, column.accessor)
        : undefined;

      return {
        id: column.columnId,
        header: () => headerContent,
        accessorFn,
        cell: ({ row, getValue }) => {
          const value = column.accessor ? getValue() : undefined;
          if (typeof column.render === "function") {
            return column.render(value, row.original);
          }
          return value ?? null;
        },
        enableSorting: isColumnSortable(column, index),
        className: column.className,
      };
    });

    return [selectionColumn, ...mapped];
  }, [normalizedColumns, selectionColumn, isColumnSortable]);

  return (
    <TableV2
      parentClassName="card"
      columns={tableColumns}
      data={pagination.pageRows}
      totalRows={Number.isFinite(totalRows) ? totalRows : pagination.total} // prefer parent total
      page={pagination.currentPage}
      size={pagination.effectiveSize}
      onPageChange={pagination.setPage}
      onSizeChange={pagination.setPageSize}
      sorting={sorting}
      onSortingChange={onSortingChange}
      getRowId={(row, index) =>
        String(row?.id ?? row?._id ?? row?.crmPersonId ?? index)
      }
      rowSelection={rowSelection}
      onRowSelectionChange={onRowSelectionChange}
      nowrap
      stickyHeader
    />
  );
};
