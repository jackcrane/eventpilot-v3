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
import {
  useCrmSegment,
  DEFAULT_SEGMENT_PAGINATION,
} from "../../hooks/useCrmSegment";
import { useCrmStoredFilters } from "../../hooks/useCrmStoredFilters";
import { useCrmManualFilters } from "../../hooks/useCrmManualFilters";
import { useCrmColumnConfig } from "../../hooks/useCrmColumnConfig";
import { useCrmAiState } from "../../hooks/useCrmAiState";
import { useCrmPersons } from "../../hooks/useCrmPersons";
import { useMailingLists } from "../../hooks/useMailingLists";
import { filterPersons } from "../../util/crm/filterPersons";
import { CrmMailingListBulkAction } from "./CrmMailingListBulkAction";
import { Row } from "../../util/Flex";
import { useCrmCsvExport } from "../../hooks/useCrmCsvExport";

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

  const [aiCollapsed, setAiCollapsed] = useState(false);

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [orderBy, setOrderBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [selectedPersonIds, setSelectedPersonIds] = useState([]);
  const pageChangeReasonRef = useRef("initial");
  const lastAiResultsRef = useRef(null);
  const lastAiAstRef = useRef(null);

  const logPagination = useCallback((message, payload = {}) => {
    console.debug("[CRM Pagination]", message, payload);
  }, []);

  const paginationState = useMemo(() => {
    const nextPage =
      Number.isFinite(page) && page > 0
        ? page
        : DEFAULT_SEGMENT_PAGINATION.page;
    const nextSize =
      Number.isFinite(size) && size > 0
        ? size
        : DEFAULT_SEGMENT_PAGINATION.size;
    const nextOrderBy =
      orderBy && typeof orderBy === "string" && orderBy.trim()
        ? orderBy
        : DEFAULT_SEGMENT_PAGINATION.orderBy;
    const nextOrder =
      order === "asc" ? "asc" : DEFAULT_SEGMENT_PAGINATION.order;
    return {
      page: nextPage,
      size: nextSize,
      orderBy: nextOrderBy,
      order: nextOrder,
    };
  }, [page, size, orderBy, order]);

  const lastManualPaginationRef = useRef({ ...paginationState });
  const wasUsingAiRef = useRef(false);

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
    pagination: paginationState,
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
    page: aiState.usingAi ? undefined : paginationState.page,
    size: aiState.usingAi ? undefined : paginationState.size,
    orderBy: aiState.usingAi ? undefined : paginationState.orderBy,
    order: aiState.usingAi ? undefined : paginationState.order,
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

  const basePersons = aiState.usingAi
    ? aiState.aiResults?.crmPersons
    : personsQuery.crmPersons;

  const participantFieldLabels = useMemo(() => {
    if (!Array.isArray(basePersons) || !basePersons.length) return [];
    const labels = new Set();
    for (const person of basePersons) {
      const fields = person?.participantStats?.fields;
      if (!fields) continue;
      Object.keys(fields).forEach((label) => {
        if (label) labels.add(label);
      });
    }
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }, [basePersons]);

  const volunteerFieldLabels = useMemo(() => {
    if (!Array.isArray(basePersons) || !basePersons.length) return [];
    const labels = new Set();
    for (const person of basePersons) {
      const fields = person?.volunteerStats?.fields;
      if (!fields) continue;
      Object.keys(fields).forEach((label) => {
        if (label) labels.add(label);
      });
    }
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }, [basePersons]);

  const onViewPerson = useCallback(
    (id) => `/events/${eventId}/crm/${id}`,
    [eventId]
  );

  const columnConfig = useCrmColumnConfig({
    eventId,
    crmFields: crm.crmFields,
    onViewPerson,
    participantFieldLabels,
    volunteerFieldLabels,
  });
  const csvExport = useCrmCsvExport({
    eventId,
    search: manualFilters.search,
    serverFilters: manualFilters.serverFilters,
    clientFilters: manualFilters.filters,
    orderBy: paginationState.orderBy,
    order: paginationState.order,
    aiState,
  });
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

  useEffect(() => {
    if (!aiState.usingAi) {
      lastAiAstRef.current = null;
      return;
    }

    const ast = aiState.lastAst;
    if (!ast) return;
    if (lastAiAstRef.current === ast) return;
    lastAiAstRef.current = ast;

    if (page !== 1) {
      pageChangeReasonRef.current = "ai-segment-change";
      logPagination("Resetting page due to AI segment change", {
        nextPage: 1,
      });
      setPage(1);
    }
  }, [aiState.usingAi, aiState.lastAst, page, logPagination]);

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
    logPagination("Resetting page due to size change", {
      nextPage: 1,
      nextSize,
    });
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
      current.page === paginationState.page &&
      current.size === paginationState.size &&
      (current.orderBy || "") === (paginationState.orderBy || "") &&
      (current.order || "") === (paginationState.order || "");
    if (matches && !segmentLoading) return;

    let cancelled = false;
    (async () => {
      const res = await runSegment({
        filter,
        debug: !!aiState.lastAst?.debug,
        pagination: paginationState,
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
    paginationState.page,
    paginationState.size,
    paginationState.orderBy,
    paginationState.order,
  ]);

  useEffect(() => {
    const wasUsingAi = wasUsingAiRef.current;
    if (!wasUsingAi && aiState.usingAi) {
      lastManualPaginationRef.current = { ...paginationState };
    } else if (wasUsingAi && !aiState.usingAi) {
      const restored =
        lastManualPaginationRef.current || DEFAULT_SEGMENT_PAGINATION;
      const nextPage =
        Number.isFinite(restored?.page) && restored.page > 0
          ? restored.page
          : DEFAULT_SEGMENT_PAGINATION.page;
      const nextSize =
        Number.isFinite(restored?.size) && restored.size > 0
          ? restored.size
          : DEFAULT_SEGMENT_PAGINATION.size;
      const nextOrderBy =
        restored?.orderBy && typeof restored.orderBy === "string"
          ? restored.orderBy
          : DEFAULT_SEGMENT_PAGINATION.orderBy;
      const nextOrder =
        restored?.order === "asc" ? "asc" : DEFAULT_SEGMENT_PAGINATION.order;

      if (page !== nextPage) setPage(nextPage);
      if (size !== nextSize) setSize(nextSize);
      if (orderBy !== nextOrderBy) setOrderBy(nextOrderBy);
      if (order !== nextOrder) setOrder(nextOrder);
    }
    wasUsingAiRef.current = aiState.usingAi;
  }, [aiState.usingAi, page, size, orderBy, order]);

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
    if (!aiState.usingAi) {
      lastAiResultsRef.current = null;
      return;
    }

    const results = aiState.aiResults;
    if (!results) {
      lastAiResultsRef.current = null;
      return;
    }

    if (results === lastAiResultsRef.current) return;
    lastAiResultsRef.current = results;

    const paginationMeta = results.pagination;
    if (!paginationMeta) return;

    const {
      page: metaPage,
      orderBy: metaOrderBy,
      order: metaOrder,
    } = paginationMeta;

    if (Number.isFinite(metaPage) && metaPage !== page) {
      pageChangeReasonRef.current = "ai-pagination-sync";
      logPagination("Syncing page from AI results", { metaPage });
      setPage(metaPage);
    }
    if (metaOrderBy && metaOrderBy !== orderBy) setOrderBy(metaOrderBy);
    if (metaOrder && metaOrder !== order) setOrder(metaOrder);
  }, [aiState.usingAi, aiState.aiResults, page, orderBy, order, logPagination]);

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

  const hasCrmData =
    typeof crm.crmFields !== "undefined" ||
    typeof crm.crmPersons !== "undefined" ||
    Boolean(crm.error);

  const hasPersonsData = aiState.usingAi
    ? typeof aiState.aiResults?.crmPersons !== "undefined" ||
      Boolean(aiState.error)
    : typeof personsQuery.crmPersons !== "undefined" ||
      Boolean(personsQuery.error);

  useEffect(() => {
    if (!hasInitialLoaded && hasCrmData && hasPersonsData) {
      setHasInitialLoaded(true);
    }
  }, [hasInitialLoaded, hasCrmData, hasPersonsData]);

  const pageLoading = !hasCrmData || !hasPersonsData;

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
        onDownloadCsv={() =>
          csvExport.downloadCsv({ columns: columnConfig.visibleColumns })
        }
        downloadingCsv={csvExport.downloading}
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
        page={paginationState.page}
        size={paginationState.size}
        totalRows={
          aiState.usingAi ? aiState.aiResults?.total : personsQuery.total
        }
        onSetPage={handlePageChange}
        onSetSize={handleSizeChange}
        orderBy={paginationState.orderBy}
        order={paginationState.order}
        onSetOrder={handleOrderChange}
        loading={hasInitialLoaded && busy}
        selectedIds={selectedPersonIds}
        onSelectionChange={handleSelectionChange}
      />
    </EventPage>
  );
};
