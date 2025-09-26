import React, { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { TableV2 } from "tabler-react-2/dist/table-v2";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { Empty } from "../../../../../components/empty/Empty";
import { useParticipantRoster } from "../../../../../hooks/useParticipantRoster";
import { useColumnConfig } from "../../../../../hooks/useColumnConfig";
import { buildParticipantColumns } from "../../../../../util/roster/participantColumns";
import { ColumnsPicker } from "../../../../../components/columnsPicker/ColumnsPicker";
import { Row } from "../../../../../util/Flex";

export const RegistrationsPage = () => {
  const { eventId } = useParams();
  const roster = useParticipantRoster({ eventId });

  const baseColumns = useMemo(
    () => buildParticipantColumns({ fields: roster.fields }),
    [roster.fields]
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

  const showEmpty =
    !roster.loading && !roster.validating && Number(roster.total) === 0;

  return (
    <EventPage title="Registrations" loading={false}>
      {showEmpty ? (
        <Empty gradient={false} />
      ) : (
        <div className="d-flex flex-column gap-3">
          <Row justify="flex-end" align="center">
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
