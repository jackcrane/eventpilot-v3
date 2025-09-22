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
    loading = false,
  } = props;

  const normalizedColumns = useMemo(
    () =>
      columns.map((column, index) => ({
        ...column,
        columnId: getCrmColumnId(column, index),
      })),
    [columns]
  );

  const normalizedData = useMemo(() => {
    if (!Array.isArray(data)) return [];

    const toArray = (value) => {
      if (Array.isArray(value)) return value;
      if (value == null) return [];
      return [value];
    };

    return data.map((person) => {
      const emails = toArray(person?.emails);
      const phones = toArray(person?.phones);
      const fieldValues = toArray(person?.fieldValues);
      const hasFieldsObject =
        person?.fields &&
        !Array.isArray(person.fields) &&
        typeof person.fields === "object";

      if (
        emails === person?.emails &&
        phones === person?.phones &&
        fieldValues === person?.fieldValues &&
        hasFieldsObject
      ) {
        return person;
      }

      const next = {
        ...person,
        emails,
        phones,
        fieldValues,
      };

      if (!hasFieldsObject) {
        next.fields = fieldValues.reduce((acc, entry) => {
          if (!entry || typeof entry !== "object") return acc;
          const fieldId = entry.crmFieldId ?? entry.fieldId;
          if (!fieldId) return acc;
          acc[fieldId] = entry.value ?? "";
          return acc;
        }, {});
      }

      return next;
    });
  }, [data]);

  const { sorting, onSortingChange, isColumnSortable, applySorting } =
    useCrmTableSorting({
      columns: normalizedColumns,
      orderBy,
      order,
      onSetOrder,
    });

  const sortedData = useMemo(
    () => applySorting(normalizedData || []),
    [applySorting, normalizedData]
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

      const hasStringAccessor =
        typeof column.accessor === "string" &&
        column.accessor.trim().length > 0;
      const hasAccessorFn = typeof column.accessor === "function";
      const accessorIsPath = hasStringAccessor && column.accessor.includes(".");

      const def = {
        id: String(column.columnId),
        header:
          typeof column.header === "function"
            ? (ctx) => column.header(ctx)
            : () => headerContent,
        enableSorting: isColumnSortable(column, index),
      };

      if (hasAccessorFn) {
        def.accessorFn = (row) => column.accessor(row);
      } else if (hasStringAccessor && !accessorIsPath) {
        def.accessorKey = column.accessor;
      } else if (hasStringAccessor && accessorIsPath) {
        def.accessorFn = (row) =>
          getCrmValueByAccessor(row ?? {}, column.accessor);
      } else {
        def.accessorFn = () => null;
      }

      const resolveValue = (row, getValue) => {
        if (hasAccessorFn) return column.accessor(row);
        if (hasStringAccessor)
          return getCrmValueByAccessor(row ?? {}, column.accessor);
        if (typeof getValue === "function") return getValue();
        return null;
      };

      if (typeof column.cell === "function") {
        def.cell = column.cell;
      } else {
        def.cell = ({ row, getValue }) => {
          const value = resolveValue(row?.original ?? {}, getValue);
          return typeof column.render === "function"
            ? column.render(value ?? null, row.original)
            : value ?? null;
        };
      }

      if (column.className) def.className = column.className;
      if (column.size) def.size = column.size;
      if (column.meta) def.meta = column.meta;

      return def;
    });

    const cols = selectionColumn ? [selectionColumn, ...mapped] : mapped;
    return cols.map((c, i) => ({ ...c, id: String(c.id ?? `col_${i}`) }));
  }, [normalizedColumns, selectionColumn, isColumnSortable]);

  return (
    <>
      <TableV2
        key={tableColumns.map((column) => column.id).join(":")}
        parentClassName="card"
        className="zi-0"
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
        showSelectionColumn
        loading={loading}
      />
    </>
  );
};
