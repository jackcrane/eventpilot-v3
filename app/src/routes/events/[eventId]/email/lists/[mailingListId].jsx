import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { TableV2 } from "tabler-react-2/dist/table-v2";
import { Badge, Button, Typography } from "tabler-react-2";
import toast from "react-hot-toast";
import { EventPage } from "../../../../../../components/eventPage/EventPage";
import { Row } from "../../../../../../util/Flex";
import { Empty } from "../../../../../../components/empty/Empty";
import { useMailingList } from "../../../../../../hooks/useMailingList";
import { useMailingListMembers } from "../../../../../../hooks/useMailingListMembers";
import { useCrmTableSelection } from "../../../../../../hooks/useCrmTableSelection";

const STATUS_COLORS = {
  ACTIVE: "green",
  UNSUBSCRIBED: "yellow",
  INACTIVE: "orange",
  DELETED: "red",
};

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch (e) {
    return "—";
  }
};

export const EventMailingListMembersPage = () => {
  const { eventId, mailingListId } = useParams();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState([]);
  const [removing, setRemoving] = useState(false);

  const {
    mailingList,
    memberCount: listMemberCount,
    loading: listLoading,
  } = useMailingList({ eventId, mailingListId });

  const {
    members,
    loading: membersLoading,
    error: membersError,
    addMembers,
    page: resolvedPage,
    size: resolvedSize,
    totalMembers,
  } = useMailingListMembers({
    eventId,
    mailingListId,
    page,
    pageSize,
  });

  useEffect(() => {
    if (Number.isFinite(resolvedPage) && resolvedPage !== page) {
      setPage(resolvedPage);
      setSelectedIds([]);
    }
  }, [resolvedPage, page]);

  useEffect(() => {
    if (Number.isFinite(resolvedSize) && resolvedSize !== pageSize) {
      setPageSize(resolvedSize);
    }
  }, [resolvedSize, pageSize]);

  const tableRows = useMemo(
    () =>
      Array.isArray(members)
        ? members.map((member) => ({
            ...member,
            id: member?.crmPersonId || member?.crmPerson?.id || member?.id,
          }))
        : [],
    [members]
  );

  const { selectionColumn, rowSelection, onRowSelectionChange } =
    useCrmTableSelection({
      rows: tableRows,
      controlledSelectedIds: selectedIds,
      onSelectionChange: setSelectedIds,
    });

  const columns = useMemo(() => {
    const baseColumns = [
      {
        id: "member",
        header: () => "Member",
        cell: ({ row }) => {
          const person = row.original?.crmPerson;
          const primaryEmail = person?.emails?.[0]?.email;
          const otherEmails = person?.emails
            ?.slice(1)
            .map((email) => email.email)
            .filter(Boolean);
          return (
            <div>
              <Typography.Text className="mb-0">
                {person?.name || "Unnamed"}
              </Typography.Text>
              {primaryEmail ? (
                <Typography.Text className="mb-0 text-muted">
                  {primaryEmail}
                  {otherEmails?.length ? `, ${otherEmails.join(", ")}` : ""}
                </Typography.Text>
              ) : null}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "status",
        header: () => "Status",
        cell: ({ row }) => {
          const status = row.original?.status || "UNKNOWN";
          const color = STATUS_COLORS[status] || "gray";
          return <Badge color={color}>{status}</Badge>;
        },
        size: 120,
        enableSorting: false,
      },
      {
        id: "added",
        header: () => "Added",
        cell: ({ row }) => formatDateTime(row.original?.createdAt),
        size: 180,
        enableSorting: false,
      },
    ];

    return selectionColumn ? [selectionColumn, ...baseColumns] : baseColumns;
  }, [selectionColumn]);

  const total = Number.isFinite(totalMembers) ? totalMembers : listMemberCount;
  const hasMembers = Number.isFinite(total) ? total > 0 : tableRows.length > 0;
  const effectivePage = Number.isFinite(resolvedPage) ? resolvedPage : page;
  const effectiveSize = Number.isFinite(resolvedSize) ? resolvedSize : pageSize;

  const handleRemoveSelected = async () => {
    if (!selectedIds.length) return;
    try {
      setRemoving(true);
      await toast.promise(
        addMembers(
          { crmPersonIds: selectedIds, status: "DELETED" },
          { disableToast: true }
        ),
        {
          loading: "Removing members…",
          success: "Members removed",
          error: (e) => e?.message || "Error removing members",
        }
      );
      setSelectedIds([]);
    } catch (error) {
      // handled by toast
    } finally {
      setRemoving(false);
    }
  };

  const loading = listLoading || membersLoading;

  return (
    <EventPage
      title={mailingList?.title || "Mailing List"}
      description="Review and manage mailing list members."
      loading={loading}
    >
      <Row justify="space-between" align="center" className="mb-3">
        {selectedIds.length > 0 ? (
          <Button
            variant="danger"
            onClick={handleRemoveSelected}
            loading={removing}
            outline
          >
            Remove selected ({selectedIds.length})
          </Button>
        ) : null}
      </Row>

      {membersError ? (
        <Typography.Text className="text-danger">
          Failed to load members. Please try again.
        </Typography.Text>
      ) : hasMembers ? (
        <TableV2
          parentClassName="card"
          columns={columns}
          data={tableRows}
          totalRows={Number.isFinite(total) ? total : tableRows.length}
          page={effectivePage}
          size={effectiveSize}
          onPageChange={(next) => {
            setPage(next);
            setSelectedIds([]);
          }}
          onSizeChange={(nextSize) => {
            setPageSize(nextSize);
            setPage(1);
            setSelectedIds([]);
          }}
          getRowId={(row) => String(row.id)}
          rowSelection={rowSelection}
          onRowSelectionChange={onRowSelectionChange}
          showSelectionColumn
          stickyHeader
          loading={membersLoading}
        />
      ) : (
        <Empty
          gradient={false}
          title="No members yet."
          text="Add people to this mailing list to manage them here."
        />
      )}
    </EventPage>
  );
};

export default EventMailingListMembersPage;
