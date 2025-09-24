import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Util, useOffcanvas, Button, Input, Typography } from "tabler-react-2";
import toast from "react-hot-toast";
import { EventPage } from "../eventPage/EventPage";
import { Empty } from "../empty/Empty";
import { CrmHeaderActions } from "./CrmHeaderActions";
import { CrmFilterBar } from "./CrmFilterBar";
import { CrmImportProgressAlerts } from "./CrmImportProgressAlerts";
import { CrmPersonsTable } from "./CrmPersonsTable";
import { useCrm } from "../../hooks/useCrm";
import { useCrmFields } from "../../hooks/useCrmFields";
import { useCrmSavedSegments } from "../../hooks/useCrmSavedSegments";
import { useCrmSegment } from "../../hooks/useCrmSegment";
import { useCrmStoredFilters } from "../../hooks/useCrmStoredFilters";
import { useCrmManualFilters } from "../../hooks/useCrmManualFilters";
import { useCrmColumnConfig } from "../../hooks/useCrmColumnConfig";
import { useCrmAiState } from "../../hooks/useCrmAiState";
import { useCrmPersons } from "../../hooks/useCrmPersons";
import { useMailingLists } from "../../hooks/useMailingLists";
import { filterPersons } from "../../util/crm/filterPersons";
import { CrmMailingListBulkAction } from "./CrmMailingListBulkAction";
import { Row } from "../../util/Flex";

const DESCRIPTION =
  "This is the contacts page. It is a powerful CRM for managing your event's contacts.";

const AiMailingListCreateContent = ({ defaultTitle, onCreate, onCancel }) => {
  const [title, setTitle] = useState(defaultTitle || "");
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
      const ok = await onCreate(trimmed);
      if (!ok) {
        setSaving(false);
      }
    } catch (error) {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <Typography.H5 className="mb-0 text-secondary">
          MAILING LIST
        </Typography.H5>
        <Typography.H1 className="mb-1">Create from AI segment</Typography.H1>
        <Typography.Text className="text-muted">
          Give this mailing list a name. We will automatically link the current
          AI segment and keep members in sync.
        </Typography.Text>
      </div>
      <Input
        label="Mailing list name"
        value={title}
        onChange={setTitle}
        onBlur={() => setTouched(true)}
        placeholder="AI Segment"
        required
        invalid={showError}
        invalidText={showError ? "Name is required" : undefined}
      />
      <Row gap={0.5} justify="flex-end">
        <Button
          type="submit"
          variant="primary"
          loading={saving}
          disabled={!trimmed || saving}
        >
          Create list
        </Button>
      </Row>
    </form>
  );
};

export const EventCrmPage = ({ eventId }) => {
  const navigate = useNavigate();

  const crm = useCrm({ eventId });
  const offcanvasState = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1051 },
  });
  const fieldsModal = useCrmFields({ eventId });
  const { savedSegments, loading: savedSegmentsLoading } = useCrmSavedSegments({
    eventId,
  });
  const { run: runSegment, loading: segmentLoading } = useCrmSegment({
    eventId,
  });
  const [storedFilters, setStoredFilters, storedFiltersLoading] =
    useCrmStoredFilters();

  const manualFilters = useCrmManualFilters({
    crmFields: crm.crmFields,
    storedFilters,
    setStoredFilters,
  });

  const { createMailingList } = useMailingLists({ eventId });

  const columnConfig = useCrmColumnConfig({
    crmFields: crm.crmFields,
    onViewPerson: (id) => navigate(`/events/${eventId}/crm/${id}`),
  });

  const [aiCollapsed, setAiCollapsed] = useState(false);

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [orderBy, setOrderBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [selectedPersonIds, setSelectedPersonIds] = useState([]);
  const pageChangeReasonRef = useRef("initial");

  const logPagination = useCallback((message, payload = {}) => {
    console.debug("[CRM Pagination]", message, payload);
  }, []);

  const aiState = useCrmAiState({
    eventId,
    storedFilters,
    storedFiltersLoading,
    setStoredFilters,
    savedSegments,
    savedSegmentsLoading,
    runSavedSegment: runSegment,
    offcanvas: offcanvasState.offcanvas,
    close: offcanvasState.close,
    pagination: { page, size, orderBy, order },
  });

  const handleCreateAiMailingList = useCallback(() => {
    if (!aiState.currentSavedId) {
      toast.error("Save the AI segment before creating a mailing list.");
      return;
    }

    const suggested = (aiState.savedTitle || aiState.aiTitle || "").trim();

    const onCreate = async (title) => {
      const mailingList = await createMailingList({
        title,
        crmSavedSegmentId: aiState.currentSavedId,
      });

      if (mailingList?.id) {
        offcanvasState.close();
        navigate(`/events/${eventId}/email/lists/${mailingList.id}`);
        return true;
      }

      return false;
    };

    offcanvasState.offcanvas({
      title: "Create mailing list",
      content: (
        <AiMailingListCreateContent
          defaultTitle={suggested || "AI Segment"}
          onCreate={onCreate}
          onCancel={offcanvasState.close}
        />
      ),
    });
  }, [
    aiState.currentSavedId,
    aiState.savedTitle,
    aiState.aiTitle,
    createMailingList,
    offcanvasState,
    navigate,
    eventId,
  ]);

  const personsQuery = useCrmPersons({
    eventId,
    page: aiState.usingAi ? undefined : page,
    size: aiState.usingAi ? undefined : size,
    orderBy: aiState.usingAi ? undefined : orderBy,
    order: aiState.usingAi ? undefined : order,
    q: aiState.usingAi ? undefined : manualFilters.search,
    filters: aiState.usingAi ? undefined : manualFilters.serverFilters,
  });

  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);
  const busy =
    crm.loading ||
    personsQuery.loading ||
    crm.validating ||
    personsQuery.validating ||
    (aiState.usingAi && segmentLoading);

  useEffect(() => {
    setHasInitialLoaded(false);
    setSelectedPersonIds([]);
  }, [eventId]);

  useEffect(() => {
    if (!hasInitialLoaded && !crm.loading && !personsQuery.loading) {
      setHasInitialLoaded(true);
    }
  }, [hasInitialLoaded, crm.loading, personsQuery.loading]);

  const basePersons = aiState.aiResults?.crmPersons || personsQuery.crmPersons;
  const filteredPersons = useMemo(
    () =>
      basePersons
        ? filterPersons({
            persons: basePersons,
            filters: manualFilters.filters,
            search: manualFilters.search,
          })
        : basePersons,
    [basePersons, manualFilters.filters, manualFilters.search]
  );

  const handleSearchChange = (value) => {
    manualFilters.setSearch(value);
    pageChangeReasonRef.current = "search-change";
    logPagination("Resetting page due to search", { nextPage: 1 });
    setPage(1);
  };

  const handleFilterChange = (next) => {
    manualFilters.setFilters(next);
    pageChangeReasonRef.current = "filter-change";
    logPagination("Resetting page due to filter change", { nextPage: 1 });
    setPage(1);
  };

  const handlePageChange = (nextPage) => {
    pageChangeReasonRef.current = `table-${nextPage}`;
    logPagination("Page requested from table", { nextPage });
    setPage(nextPage);
  };

  const handleSizeChange = (nextSize) => {
    setSize(nextSize);
    pageChangeReasonRef.current = "page-size-change";
    logPagination("Resetting page due to size change", { nextPage: 1, nextSize });
    setPage(1);
  };

  const handleOrderChange = (nextOrderBy, nextOrder) => {
    const normalizedOrder = nextOrder === "asc" ? "asc" : "desc";
    const orderByChanged = nextOrderBy !== orderBy;
    const orderChanged = normalizedOrder !== order;

    if (orderByChanged) setOrderBy(nextOrderBy);
    if (orderChanged) setOrder(normalizedOrder);

    if (orderByChanged || orderChanged) {
      pageChangeReasonRef.current = "sort-change";
      logPagination("Resetting page due to sort change", {
        nextPage: 1,
        orderBy: nextOrderBy,
        order: normalizedOrder,
      });
      setPage(1);
    }
  };

  const handleSelectionChange = useCallback((ids = []) => {
    setSelectedPersonIds(Array.isArray(ids) ? Array.from(new Set(ids)) : []);
  }, []);

  useEffect(() => {
    if (!aiState.usingAi) return;
    const filter = aiState.lastAst?.filter || aiState.lastAst;
    if (!filter) return;
    const current = aiState.aiResults?.pagination;
    const matches =
      current &&
      Number.isFinite(current.page) &&
      Number.isFinite(current.size) &&
      current.page === page &&
      current.size === size &&
      (current.orderBy || "") === (orderBy || "") &&
      (current.order || "") === (order || "");
    if (matches && !segmentLoading) return;

    let cancelled = false;
    (async () => {
      const res = await runSegment({
        filter,
        debug: !!aiState.lastAst?.debug,
        pagination: { page, size, orderBy, order },
      });
      if (!cancelled && res?.ok) {
        aiState.updateResults(res);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    aiState.usingAi,
    aiState.lastAst,
    aiState.aiResults?.pagination?.page,
    aiState.aiResults?.pagination?.size,
    aiState.aiResults?.pagination?.orderBy,
    aiState.aiResults?.pagination?.order,
    aiState.updateResults,
    runSegment,
    segmentLoading,
    page,
    size,
    orderBy,
    order,
  ]);

  useEffect(() => {
    if (aiState.usingAi) return;
    if (!Number.isFinite(personsQuery.total)) return;
    if (!Number.isFinite(size) || size <= 0) return;
    const maxPage = Math.max(1, Math.ceil(personsQuery.total / size));
    setPage((prev) => {
      const next = prev > maxPage ? maxPage : prev;
      if (next !== prev) {
        pageChangeReasonRef.current = "clamp-non-ai";
        logPagination("Clamping page to max (non-AI)", {
          previous: prev,
          next,
          maxPage,
        });
      }
      return next;
    });
  }, [aiState.usingAi, personsQuery.total, size]);

  useEffect(() => {
    if (!aiState.usingAi) return;
    const total = aiState.aiResults?.total;
    if (!Number.isFinite(total)) return;
    if (!Number.isFinite(size) || size <= 0) return;
    const maxPage = Math.max(1, Math.ceil(total / size));
    setPage((prev) => {
      const next = prev > maxPage ? maxPage : prev;
      if (next !== prev) {
        pageChangeReasonRef.current = "clamp-ai";
        logPagination("Clamping page to max (AI)", {
          previous: prev,
          next,
          maxPage,
        });
      }
      return next;
    });
  }, [aiState.usingAi, aiState.aiResults?.total, size]);

  useEffect(() => {
    if (!aiState.usingAi) return;
    const paginationMeta = aiState.aiResults?.pagination;
    if (!paginationMeta) return;
    const {
      page: metaPage,
      size: metaSize,
      orderBy: metaOrderBy,
      order: metaOrder,
    } = paginationMeta;
    if (Number.isFinite(metaPage) && metaPage !== page) {
      pageChangeReasonRef.current = "ai-pagination-sync";
      logPagination("Syncing page from AI results", { metaPage });
      setPage(metaPage);
    }
    if (Number.isFinite(metaSize) && metaSize !== size) setSize(metaSize);
    if (metaOrderBy && metaOrderBy !== orderBy) setOrderBy(metaOrderBy);
    if (metaOrder && metaOrder !== order) setOrder(metaOrder);
  }, [
    aiState.usingAi,
    aiState.aiResults?.pagination?.page,
    aiState.aiResults?.pagination?.size,
    aiState.aiResults?.pagination?.orderBy,
    aiState.aiResults?.pagination?.order,
    page,
    size,
    orderBy,
    order,
  ]);

  const shouldShowEmpty =
    !aiState.usingAi &&
    !manualFilters.search.trim() &&
    (manualFilters.serverFilters || []).length === 0 &&
    (personsQuery.total || 0) === 0;

  useEffect(() => {
    logPagination("Page state updated", {
      page,
      reason: pageChangeReasonRef.current,
    });
    pageChangeReasonRef.current = "unknown";
  }, [page, logPagination]);

  const pageLoading =
    !hasInitialLoaded &&
    (crm.loading ||
      personsQuery.loading ||
      (aiState.usingAi && segmentLoading));

  const toggleAiCollapsed = () => setAiCollapsed((prev) => !prev);
  const showAiBadge = Boolean(storedFilters?.ai?.enabled || aiState.aiResults);

  return (
    <EventPage
      title="CRM"
      loading={pageLoading}
      docsLink="https://docs.geteventpilot.com/docs/pages/crm/"
      description={DESCRIPTION}
    >
      {offcanvasState.OffcanvasElement}
      {fieldsModal.CreateCrmFieldModalElement}

      <CrmHeaderActions
        columnConfig={columnConfig.columnConfig}
        setColumnConfig={columnConfig.setColumnConfig}
        offcanvas={offcanvasState.offcanvas}
        createCrmFieldModal={fieldsModal.createCrmFieldModal}
        mutationLoading={fieldsModal.mutationLoading}
        CreateCrmFieldModalElement={fieldsModal.CreateCrmFieldModalElement}
      />

      <Util.Hr style={{ margin: "1rem 0" }} />

      <CrmFilterBar
        search={manualFilters.search}
        setSearch={handleSearchChange}
        filterFieldDefs={manualFilters.filterFieldDefs}
        setFilters={handleFilterChange}
        initialFilters={manualFilters.initialFilters}
        showAiBadge={showAiBadge}
        aiTitle={aiState.aiTitle}
        aiCollapsed={aiCollapsed}
        onToggleAi={toggleAiCollapsed}
        onRefineAi={aiState.openRefine}
        onCreateMailingList={
          aiState.currentSavedId ? handleCreateAiMailingList : undefined
        }
        onClearAi={aiState.clearAi}
        onAskAi={aiState.openPrompt}
      />

      <CrmMailingListBulkAction
        eventId={eventId}
        selectedIds={selectedPersonIds}
        onClearSelection={() => setSelectedPersonIds([])}
      />

      {shouldShowEmpty && (
        <Empty text="You don't have any CRM responses yet." />
      )}

      <CrmImportProgressAlerts imports={personsQuery.imports} />

      <CrmPersonsTable
        data={aiState.usingAi ? filteredPersons : personsQuery.crmPersons}
        columns={columnConfig.visibleColumns}
        page={page}
        size={size}
        totalRows={
          aiState.usingAi ? aiState.aiResults?.total : personsQuery.total
        }
        onSetPage={handlePageChange}
        onSetSize={handleSizeChange}
        orderBy={orderBy}
        order={order}
        onSetOrder={handleOrderChange}
        loading={hasInitialLoaded && busy}
        selectedIds={selectedPersonIds}
        onSelectionChange={handleSelectionChange}
      />
    </EventPage>
  );
};
