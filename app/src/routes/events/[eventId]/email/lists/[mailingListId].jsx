import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { TableV2 } from "tabler-react-2/dist/table-v2";
import {
  Badge,
  Button,
  Typography,
  useOffcanvas,
  Dropdown,
  Input,
  useConfirm,
  Card,
} from "tabler-react-2";
import toast from "react-hot-toast";
import { EventPage } from "../../../../../../components/eventPage/EventPage";
import { Row } from "../../../../../../util/Flex";
import { useMailingList } from "../../../../../../hooks/useMailingList";
import {
  MAILING_LIST_MEMBER_STATUSES,
  useMailingListMembers,
} from "../../../../../../hooks/useMailingListMembers";
import { useCrmTableSelection } from "../../../../../../hooks/useCrmTableSelection";
import { MailingListAddPeoplePanel } from "../../../../../../components/crm/MailingListAddPeoplePanel";
import moment from "moment";
import { DATETIME_FORMAT } from "../../../../../../util/Constants";
import { AiSegmentPromptPanel } from "../../../../../../components/crmAi/AiSegmentPromptPanel";
import { AiSegmentRefinePanel } from "../../../../../../components/crmAi/AiSegmentRefinePanel";
import {
  useCrmSegment,
  DEFAULT_SEGMENT_PAGINATION,
} from "../../../../../../hooks/useCrmSegment";
import { MailingListFilterBar } from "../../../../../../components/mailingLists/MailingListFilterBar";

const STATUS_COLORS = {
  ACTIVE: "green",
  UNSUBSCRIBED: "yellow",
  INACTIVE: "orange",
  DELETED: "red",
};

const RenameMailingListForm = ({ mailingList, onSubmit, onCancel }) => {
  const [title, setTitle] = useState(mailingList?.title || "");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const trimmed = title.trim();
  const showError = touched && !trimmed;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const ok = await onSubmit(trimmed);
      if (!ok) setSaving(false);
    } catch (e) {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div>
        <Typography.H5 className="mb-0 text-secondary">
          MAILING LIST
        </Typography.H5>
        <Typography.H1 className="mb-2">{mailingList?.title}</Typography.H1>
        <Typography.Text className="text-muted">
          Update the name shown for this mailing list.
        </Typography.Text>
      </div>
      <Input
        label="Mailing list name"
        value={title}
        onChange={setTitle}
        onBlur={() => setTouched(true)}
        placeholder="List name"
        required
        invalid={showError}
        invalidText={showError ? "Title is required" : undefined}
      />
      <Row gap={0.5} justify="flex-end">
        <Button
          type="button"
          variant="secondary"
          disabled={saving}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={saving}
          disabled={!trimmed || saving}
        >
          Save
        </Button>
      </Row>
    </form>
  );
};

export const EventMailingListMembersPage = () => {
  const { eventId, mailingListId } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState([]);
  const [removing, setRemoving] = useState(false);
  const [aiUpdating, setAiUpdating] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const memberFilterFieldDefs = useMemo(
    () => [
      {
        label: "name",
        hrTitle: "Name",
        type: "text",
        defaultOperation: "contains",
      },
      {
        label: "email",
        hrTitle: "Email",
        type: "text",
        defaultOperation: "contains",
      },
      {
        label: "status",
        hrTitle: "Status",
        type: "enum",
        options: MAILING_LIST_MEMBER_STATUSES,
        defaultOperation: "eq",
      },
      {
        label: "createdAt",
        hrTitle: "Added Date",
        type: "date",
        defaultOperation: "date-after",
      },
    ],
    []
  );

  const coerceFilterValue = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === "string" || typeof value === "number") return value;
    if (typeof value === "boolean") return value;
    if (typeof value === "object" && "target" in value) {
      return value.target?.value ?? null;
    }
    return value;
  };

  const serializedFilters = useMemo(() => {
    if (!filters?.length) return [];
    return filters
      .map((filter) => {
        const label = filter?.field?.label;
        const operation = filter?.operation;
        if (!label || !operation) return null;
        return {
          label,
          operation,
          value: coerceFilterValue(filter?.value),
        };
      })
      .filter(Boolean);
  }, [filters]);

  const includeDeletedMembers = useMemo(() => {
    if (!serializedFilters.length) return false;
    return serializedFilters.some((filter) => {
      if (filter.label !== "status") return false;
      const value = typeof filter.value === "string" ? filter.value : null;
      if (!value) return false;
      if (filter.operation === "eq") {
        return value === "DELETED";
      }
      if (filter.operation === "neq") {
        return value !== "DELETED";
      }
      if (filter.operation === "exists" || filter.operation === "not-exists") {
        return true;
      }
      return false;
    });
  }, [serializedFilters]);

  const {
    mailingList,
    memberCount: listMemberCount,
    loading: listLoading,
    updateMailingList,
    deleteMailingList,
    setSavedSegment,
  } = useMailingList({ eventId, mailingListId });

  const {
    members,
    loading: membersLoading,
    error: membersError,
    addMembers,
    updateMemberStatus,
    removeMember,
    page: resolvedPage,
    size: resolvedSize,
    totalMembers,
  } = useMailingListMembers({
    eventId,
    mailingListId,
    page,
    pageSize,
    includeDeletedMembers,
    search,
    filters: serializedFilters,
  });

  const {
    offcanvas: openAddPeoplePanel,
    OffcanvasElement: AddPeopleOffcanvas,
    close: closeAddPeoplePanel,
  } = useOffcanvas({
    offcanvasProps: { position: "end", size: 460, zIndex: 1051 },
  });

  const {
    offcanvas: openRenamePanel,
    OffcanvasElement: RenameOffcanvas,
    close: closeRenamePanel,
  } = useOffcanvas({
    offcanvasProps: { position: "end", size: 420, zIndex: 1052 },
  });

  const {
    offcanvas: openAiPanel,
    OffcanvasElement: AiOffcanvas,
    close: closeAiPanel,
  } = useOffcanvas({
    offcanvasProps: { position: "end", size: 520, zIndex: 1053 },
  });

  const { run: runSegment, loading: runningSegment } = useCrmSegment({
    eventId,
  });

  const { confirm, ConfirmModal } = useConfirm({
    title: "Delete mailing list",
    text: "This will delete the mailing list and remove all of its members. Are you sure?",
    commitText: "Delete",
    cancelText: "Cancel",
    confirmVariant: "danger",
  });

  useEffect(() => {
    if (membersLoading) return;
    if (Number.isFinite(resolvedPage) && resolvedPage !== page) {
      setPage(resolvedPage);
      setSelectedIds([]);
    }
  }, [resolvedPage, page, membersLoading]);

  useEffect(() => {
    if (membersLoading) return;
    if (Number.isFinite(resolvedSize) && resolvedSize !== pageSize) {
      setPageSize(resolvedSize);
    }
  }, [resolvedSize, pageSize, membersLoading]);

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

  const extractCrmPersonIds = (result) => {
    if (!result) return [];
    const pool = Array.isArray(result?.crmPersons)
      ? result.crmPersons
      : Array.isArray(result?.results?.crmPersons)
      ? result.results.crmPersons
      : [];
    const ids = pool
      .map((person) => person?.id)
      .filter((id) => typeof id === "string" && id.length > 0);
    return Array.from(new Set(ids));
  };

  const handleAttachSegment = async (savedSegmentId) => {
    if (!setSavedSegment) return false;
    return setSavedSegment(savedSegmentId);
  };

  const handleAiApply = async ({ results, savedSegmentId, ast }) => {
    if (!savedSegmentId) {
      toast.error("Unable to link AI segment");
      return;
    }

    const ensureAllIds = async () => {
      const initialIds = extractCrmPersonIds(results);
      const total = Number(results?.total);
      const pageSize = Number(results?.pagination?.size);
      const filter = ast?.filter || ast;
      const paged = Number.isFinite(pageSize) && pageSize > 0;
      const needsHydration =
        filter &&
        Number.isFinite(total) &&
        total > 0 &&
        initialIds.length < total;

      if (!needsHydration) {
        return initialIds;
      }

      const full = await runSegment({
        filter,
        pagination: { page: null, size: null },
      });

      if (!full?.ok) {
        throw full?.error || new Error("Unable to load full segment results");
      }

      const hydratedIds = extractCrmPersonIds(full);
      if (hydratedIds.length >= total || !paged) {
        return hydratedIds;
      }

      // Fallback to merging if the server still paginated for safety.
      const merged = new Set([...initialIds, ...hydratedIds]);
      return Array.from(merged);
    };

    setAiUpdating(true);
    try {
      const ids = await ensureAllIds();
      if (ids.length) {
        await addMembers({ crmPersonIds: ids });
      }
      await handleAttachSegment(savedSegmentId);
    } catch (error) {
      toast.error(error?.message || "Failed to apply AI segment");
    } finally {
      setAiUpdating(false);
    }
  };

  const handleRunAiSegment = async () => {
    if (!mailingList?.crmSavedSegment?.ast) {
      toast.error("No AI segment attached yet");
      return;
    }

    let loadingToast = toast.loading("Finding matching contacts…");
    toast(
      "Searches are automatically run every 10 minutes in addition to when you trigger them manually."
    );
    try {
      const response = await runSegment({
        filter: mailingList.crmSavedSegment.ast.filter,
        pagination: { page: null, size: null },
      });

      if (!response?.ok) {
        throw response?.error || new Error("Failed to run AI segment");
      }

      toast.dismiss(loadingToast);
      loadingToast = null;

      const ids = extractCrmPersonIds(response);
      if (!ids.length) {
        toast.success("No contacts matched the AI segment yet");
        return;
      }

      await addMembers({ crmPersonIds: ids });
    } catch (error) {
      if (loadingToast) {
        toast.dismiss(loadingToast);
        loadingToast = null;
      }
      toast.error(error?.message || "Failed to run AI segment");
    }
  };

  const handleDetachSegment = async () => {
    if (!setSavedSegment) return;
    setAiUpdating(true);
    try {
      await handleAttachSegment(null);
    } finally {
      setAiUpdating(false);
    }
  };

  const openAiConfigurator = () => {
    const hasSegment = Boolean(mailingList?.crmSavedSegmentId);
    const pagination = {
      ...DEFAULT_SEGMENT_PAGINATION,
      size: 200,
    };

    if (hasSegment) {
      openAiPanel({
        title: "Update AI segment",
        content: (
          <AiSegmentRefinePanel
            eventId={eventId}
            currentSavedId={mailingList?.crmSavedSegmentId || null}
            lastPrompt={mailingList?.crmSavedSegment?.prompt || ""}
            lastAst={mailingList?.crmSavedSegment?.ast || null}
            savedTitle={mailingList?.crmSavedSegment?.title || ""}
            defaultTitle={mailingList?.title || ""}
            pagination={pagination}
            onApply={handleAiApply}
            onClose={closeAiPanel}
          />
        ),
      });
      return;
    }

    openAiPanel({
      title: "Use AI to build this list",
      content: (
        <AiSegmentPromptPanel
          eventId={eventId}
          initialTitle={mailingList?.title || ""}
          initialPrompt=""
          pagination={pagination}
          onApply={handleAiApply}
          onClose={closeAiPanel}
        />
      ),
    });
  };

  const { selectionColumn, rowSelection, onRowSelectionChange } =
    useCrmTableSelection({
      rows: tableRows,
      controlledSelectedIds: selectedIds,
      onSelectionChange: setSelectedIds,
    });

  const [memberAction, setMemberAction] = useState({ id: null, type: null });

  const handleRemoveMember = useCallback(
    async (crmPersonId) => {
      if (!crmPersonId || memberAction.id) return;
      setMemberAction({ id: crmPersonId, type: "remove" });
      try {
        await removeMember?.({ crmPersonId });
      } finally {
        setMemberAction({ id: null, type: null });
      }
    },
    [memberAction.id, removeMember]
  );

  const handleResubscribeMember = useCallback(
    async (crmPersonId) => {
      if (!crmPersonId || memberAction.id) return;
      setMemberAction({ id: crmPersonId, type: "resubscribe" });
      try {
        await updateMemberStatus?.({
          crmPersonId,
          status: "ACTIVE",
        });
      } finally {
        setMemberAction({ id: null, type: null });
      }
    },
    [memberAction.id, updateMemberStatus]
  );

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
                <Link to={`/events/${eventId}/crm/${person?.id}`}>
                  {person?.name || "Unnamed"}
                </Link>
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
        enableSorting: true,
      },
      {
        id: "status",
        header: () => "Status",
        cell: ({ row }) => {
          const status = row.original?.status || "UNKNOWN";
          const color = STATUS_COLORS[status] || "gray";
          return (
            <Badge color={color} soft>
              {status}
            </Badge>
          );
        },
        size: 120,
        enableSorting: true,
      },
      {
        id: "added",
        header: () => "Added",
        cell: ({ row }) =>
          moment(row.original?.createdAt).format(DATETIME_FORMAT),
        size: 180,
        enableSorting: true,
        sortFn: (a, b) => {
          let c = moment(a?.createdAt);
          let d = moment(b?.createdAt);
          if (!c) return 1;
          if (!d) return -1;
          return c.isAfter(d) ? 1 : -1;
        },
      },
      {
        id: "actions",
        header: () => "Actions",
        size: 220,
        enableSorting: false,
        cell: ({ row }) => {
          const crmPersonId =
            row.original?.crmPersonId || row.original?.crmPerson?.id;
          const status = row.original?.status;
          const isUnsubscribed = status === "UNSUBSCRIBED";
          const isDeleted = status === "DELETED" || row.original?.deleted;
          const isActing = memberAction.id === crmPersonId;
          const isRemoving = isActing && memberAction.type === "remove";
          const isResubscribing =
            isActing && memberAction.type === "resubscribe";

          const onRemoveClick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            handleRemoveMember(crmPersonId);
          };

          const onResubscribeClick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            handleResubscribeMember(crmPersonId);
          };

          return (
            <Row gap={0.5} wrap={false}>
              <Button
                size="sm"
                outline
                type="button"
                onClick={onRemoveClick}
                disabled={
                  !crmPersonId || isDeleted || isRemoving || isResubscribing
                }
                loading={isRemoving}
              >
                Remove
              </Button>
              {isUnsubscribed ? (
                <Button
                  size="sm"
                  type="button"
                  onClick={onResubscribeClick}
                  disabled={
                    !crmPersonId || isDeleted || isRemoving || isResubscribing
                  }
                  loading={isResubscribing}
                >
                  Re-subscribe
                </Button>
              ) : null}
            </Row>
          );
        },
      },
    ];

    return selectionColumn ? [selectionColumn, ...baseColumns] : baseColumns;
  }, [
    selectionColumn,
    memberAction.id,
    memberAction.type,
    handleRemoveMember,
    handleResubscribeMember,
  ]);

  const filteredTotal = Number.isFinite(totalMembers)
    ? totalMembers
    : tableRows.length;
  const displayMemberTotal = Number.isFinite(listMemberCount)
    ? listMemberCount
    : filteredTotal;
  const hasAppliedFilters =
    Boolean(search.trim()) || serializedFilters.length > 0;
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

  const handleAddPeople = () => {
    openAddPeoplePanel({
      title: "Add people",
      content: (
        <MailingListAddPeoplePanel
          eventId={eventId}
          mailingListId={mailingListId}
          mailingListTitle={mailingList?.title}
          addMembers={addMembers}
          onClose={closeAddPeoplePanel}
        />
      ),
    });
  };

  const handleRename = () => {
    if (!mailingList) return;
    openRenamePanel({
      title: "Rename mailing list",
      content: (
        <RenameMailingListForm
          mailingList={mailingList}
          onCancel={closeRenamePanel}
          onSubmit={async (nextTitle) => {
            if (nextTitle === mailingList.title) {
              closeRenamePanel();
              return true;
            }
            const ok = await updateMailingList?.({ title: nextTitle });
            if (ok) closeRenamePanel();
            return ok;
          }}
        />
      ),
    });
  };

  const handleDeleteList = async () => {
    const confirmed = await confirm?.();
    if (!confirmed) return;
    const ok = await deleteMailingList?.();
    if (ok) {
      navigate(`/events/${eventId}/email/lists`);
    }
  };

  const loading = listLoading || membersLoading;
  useEffect(() => {
    if (initialLoadComplete) return;
    if (!listLoading && !membersLoading) {
      setInitialLoadComplete(true);
    }
  }, [initialLoadComplete, listLoading, membersLoading]);

  const showPageLoading = !initialLoadComplete && loading;

  return (
    <EventPage
      title={mailingList?.title || "Mailing List"}
      description="Review and manage mailing list members."
      loading={showPageLoading}
    >
      {ConfirmModal}
      {AddPeopleOffcanvas}
      {RenameOffcanvas}
      {AiOffcanvas}
      <Row justify="space-between" align="center" className="mb-3">
        <div>
          <Typography.H5 className="mb-0 text-secondary">MEMBERS</Typography.H5>
          <Typography.Text className="text-muted mb-0">
            {displayMemberTotal || 0} member
            {displayMemberTotal === 1 ? "" : "s"}
          </Typography.Text>
        </div>
        <Row gap={0.5}>
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
          <Dropdown
            prompt="Actions"
            items={[
              {
                text: "Add people",
                onclick: handleAddPeople,
              },
              {
                type: "divider",
              },
              {
                text: "Rename list",
                onclick: handleRename,
              },
              {
                text: "Delete list",
                onclick: handleDeleteList,
              },
            ]}
          />
        </Row>
      </Row>

      <Card className="mb-3">
        <Row justify="space-between" align="center" wrap>
          <div style={{ maxWidth: "65%" }}>
            <Typography.H5 className="mb-1 text-secondary">
              AI SEGMENT
            </Typography.H5>
            {mailingList?.crmSavedSegmentId ? (
              <>
                <Typography.Text className="text-muted mb-0">
                  {mailingList?.crmSavedSegment?.title ||
                    mailingList?.crmSavedSegment?.prompt ||
                    "Linked saved segment"}
                </Typography.Text>
                <Typography.Text className="text-muted mb-0">
                  This list refreshes every 10 minutes using the linked AI
                  segment.
                </Typography.Text>
              </>
            ) : (
              <Typography.Text className="text-muted mb-0">
                Link an AI segment to keep this mailing list up to date
                automatically.
              </Typography.Text>
            )}
          </div>
          <Row gap={0.5} className="mt-2 mt-md-0">
            {mailingList?.crmSavedSegmentId ? (
              <Dropdown
                prompt="Actions"
                items={[
                  {
                    text: "Trigger a new search",
                    onclick: handleRunAiSegment,
                  },
                  {
                    type: "divider",
                  },
                  {
                    text: "Update AI segment",
                    onclick: openAiConfigurator,
                  },
                  {
                    text: "Detach AI segment",
                    onclick: handleDetachSegment,
                  },
                ]}
              />
            ) : (
              <Button
                className="ai-button"
                onClick={openAiConfigurator}
                disabled={aiUpdating}
              >
                Use AI
              </Button>
            )}
          </Row>
        </Row>
      </Card>

      <Row className="mb-3" gap={1} wrap>
        <div style={{ flex: 1, minWidth: 280 }}>
          <MailingListFilterBar
            search={search}
            setSearch={(value) => {
              setPage(1);
              setSearch(value);
            }}
            filterFieldDefs={memberFilterFieldDefs}
            onFiltersChange={(next) => {
              setPage(1);
              setFilters(next || []);
            }}
            placeholder="Search members..."
          />
        </div>
      </Row>

      {membersError ? (
        <Typography.Text className="text-danger">
          Failed to load members. Please try again.
        </Typography.Text>
      ) : (
        <TableV2
          parentClassName="card"
          columns={columns}
          data={tableRows}
          totalRows={filteredTotal}
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
          loading={membersLoading && initialLoadComplete}
          emptyState={() => (
            <div>
              {hasAppliedFilters
                ? "No members match your filters."
                : "No members yet. Add people to this mailing list to manage them here."}
            </div>
          )}
        />
      )}
    </EventPage>
  );
};

export default EventMailingListMembersPage;
