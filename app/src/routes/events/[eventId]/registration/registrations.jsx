import React, { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Input, useOffcanvas, useConfirm } from "tabler-react-2";
import { TableV2 } from "tabler-react-2/dist/table-v2";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { Empty } from "../../../../../components/empty/Empty";
import { FormResponseRUD } from "../../../../../components/formResponseRUD/FormResponseRUD";
import { useParticipantRoster } from "../../../../../hooks/useParticipantRoster";
import { useColumnConfig } from "../../../../../hooks/useColumnConfig";
import { buildParticipantColumns } from "../../../../../util/roster/participantColumns";
import { ColumnsPicker } from "../../../../../components/columnsPicker/ColumnsPicker";
import { Row } from "../../../../../util/Flex";
import { Filters } from "../../../../../components/filters/Filters";
import { useParticipantFilterDefinitions } from "../../../../../hooks/useParticipantFilterDefinitions";
import { useRegistrationResponse } from "../../../../../hooks/useRegistrationResponse";

export const RegistrationsPage = () => {
  const { eventId } = useParams();
  const [searchInput, setSearchInput] = useState("");
  const [filterState, setFilterState] = useState([]);

  const searchQuery = useMemo(() => searchInput.trim(), [searchInput]);

  const serverFilters = useMemo(
    () =>
      (filterState || [])
        .map((entry) => {
          const path = entry?.field?.path || entry?.field?.label;
          const operation = entry?.operation;
          if (!path || !operation) return null;
          const value = entry?.value ?? null;
          return { path, operation, value };
        })
        .filter(Boolean),
    [filterState]
  );

  const roster = useParticipantRoster({
    eventId,
    search: searchQuery,
    filters: serverFilters,
  });

  const { offcanvas, OffcanvasElement } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1050 },
  });
  const { confirm, ConfirmModal } = useConfirm({
    title: "Confirm",
    text: "Are you sure?",
    commitText: "Confirm",
    cancelText: "Cancel",
  });

  const handleOpenDetails = useCallback(
    (id) => {
      if (!id) return;
      offcanvas({
        content: (
          <FormResponseRUD
            id={id}
            confirm={confirm}
            entityLabel="REGISTRANT"
            responseHook={useRegistrationResponse}
          />
        ),
      });
    },
    [offcanvas, confirm]
  );

  const filterDefinitions = useParticipantFilterDefinitions({
    fields: roster.fields,
  });

  const baseColumns = useMemo(
    () =>
      buildParticipantColumns({
        fields: roster.fields,
        onOpenDetails: handleOpenDetails,
      }),
    [roster.fields, handleOpenDetails]
  );

  const storageKey = eventId ? `participant-roster:${eventId}` : null;

  const { columnConfig, setColumnConfig, visibleColumns } = useColumnConfig({
    storageKey,
    columns: baseColumns,
  });

  const columnLookup = useMemo(() => {
    const map = new Map();
    columnConfig.forEach((column) => map.set(column.id, column));
    return map;
  }, [columnConfig]);

  const tableColumns = useMemo(
    () =>
      visibleColumns.map((column) => {
        const def = column.column || {};
        return {
          ...def,
          id: column.id,
          header:
            typeof def.header === "function"
              ? def.header
              : () => column.label,
          enableSorting: Boolean(column.enableSorting),
          meta: {
            ...(def.meta || {}),
            orderBy: column.orderBy ?? null,
          },
        };
      }),
    [visibleColumns]
  );

  const sorting = useMemo(() => {
    if (!roster.orderBy) return [];
    const match = columnConfig.find((column) => column.orderBy === roster.orderBy);
    if (!match) return [];
    return [
      {
        id: match.id,
        desc: roster.order === "desc",
      },
    ];
  }, [columnConfig, roster.orderBy, roster.order]);

  const handleSortingChange = useCallback(
    (updater) => {
      const next =
        typeof updater === "function" ? updater(sorting) : updater ?? sorting;

      if (!Array.isArray(next) || next.length === 0) {
        if (roster.orderBy !== "createdAt" || roster.order !== "desc") {
          roster.setSorting("createdAt", "desc");
          roster.setPage(1);
        }
        return;
      }

      const { id, desc } = next[0] ?? {};
      const column = columnLookup.get(id);
      if (!column || !column.enableSorting || !column.orderBy) return;

      const nextOrder = desc ? "desc" : "asc";
      if (column.orderBy === roster.orderBy && nextOrder === roster.order) return;

      roster.setSorting(column.orderBy, nextOrder);
      roster.setPage(1);
    },
    [sorting, columnLookup, roster]
  );

  const handlePageChange = useCallback(
    (nextPage) => {
      roster.setPage(nextPage);
    },
    [roster]
  );

  const handleSizeChange = useCallback(
    (nextSize) => {
      roster.setSize(nextSize);
      roster.setPage(1);
    },
    [roster]
  );

  const handleSearchChange = useCallback(
    (value) => {
      const nextValue =
        typeof value === "string"
          ? value
          : (value?.target?.value ?? "");
      setSearchInput(nextValue);
      roster.setPage(1);
    },
    [roster]
  );

  const handleFilterChange = useCallback(
    (next) => {
      setFilterState(next || []);
      roster.setPage(1);
    },
    [roster]
  );

  const isFiltering = Boolean(searchQuery) || serverFilters.length > 0;
  const showInitialEmpty =
    !roster.loading &&
    !roster.validating &&
    Number(roster.total) === 0 &&
    !isFiltering;

  return (
    <EventPage title="Registrations" loading={false}>
      {ConfirmModal}
      {OffcanvasElement}
      {showInitialEmpty ? (
        <Empty gradient={false} />
      ) : (
        <div className="d-flex flex-column gap-3">
          <Row justify="space-between" align="center" wrap>
            <Row gap={1} align="center" wrap style={{ flex: 1, minWidth: 280 }}>
              <Input
                placeholder="Search registrations..."
                value={searchInput}
                onChange={handleSearchChange}
                style={{ minWidth: 220 }}
                className="mb-0"
              />
              <Filters
                fields={filterDefinitions}
                onFilterChange={handleFilterChange}
              />
            </Row>
            <ColumnsPicker
              columns={columnConfig}
              onColumnsChange={setColumnConfig}
            />
          </Row>
          <TableV2
            parentClassName="card"
            columns={tableColumns}
            data={roster.rows}
            totalRows={roster.total}
            page={roster.page}
            size={roster.size}
            onPageChange={handlePageChange}
            onSizeChange={handleSizeChange}
            sorting={sorting}
            onSortingChange={handleSortingChange}
            getRowId={(row, index) => String(row?.id ?? index)}
            stickyHeader
            nowrap
            loading={roster.loading || roster.validating}
            emptyState={() => (
              <div className="py-4 text-muted text-center">
                No registrations match your current filters.
              </div>
            )}
          />
        </div>
      )}
    </EventPage>
  );
};
