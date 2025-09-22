import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Util, useOffcanvas } from "tabler-react-2";
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
import { filterPersons } from "../../util/crm/filterPersons";

const DESCRIPTION =
  "This is the contacts page. It is a powerful CRM for managing your event's contacts.";

export const EventCrmPage = ({ eventId }) => {
  const navigate = useNavigate();

  const crm = useCrm({ eventId });
  const offcanvasState = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1051 },
  });
  const fieldsModal = useCrmFields({ eventId });
  const { savedSegments } = useCrmSavedSegments({ eventId });
  const segmentRunner = useCrmSegment({ eventId });
  const [storedFilters, setStoredFilters] = useCrmStoredFilters();

  const manualFilters = useCrmManualFilters({
    crmFields: crm.crmFields,
    storedFilters,
    setStoredFilters,
  });

  const columnConfig = useCrmColumnConfig({
    crmFields: crm.crmFields,
    onViewPerson: (id) => navigate(`/events/${eventId}/crm/${id}`),
  });

  const aiState = useCrmAiState({
    eventId,
    storedFilters,
    setStoredFilters,
    savedSegments,
    runSavedSegment: segmentRunner.run,
    offcanvas: offcanvasState.offcanvas,
    close: offcanvasState.close,
  });

  const [aiCollapsed, setAiCollapsed] = useState(false);

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [orderBy, setOrderBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");

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
    personsQuery.validating;

  useEffect(() => {
    setHasInitialLoaded(false);
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
    setPage(1);
  };

  const handleFilterChange = (next) => {
    manualFilters.setFilters(next);
    setPage(1);
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
  };

  const handleSizeChange = (nextSize) => {
    setSize(nextSize);
    setPage(1);
  };

  const handleOrderChange = (nextOrderBy, nextOrder) => {
    setOrderBy(nextOrderBy);
    setOrder(nextOrder);
    setPage(1);
  };

  useEffect(() => {
    if (aiState.usingAi) return;
    if (!Number.isFinite(personsQuery.total)) return;
    if (!Number.isFinite(size) || size <= 0) return;
    const maxPage = Math.max(1, Math.ceil(personsQuery.total / size));
    setPage((prev) => (prev > maxPage ? maxPage : prev));
  }, [aiState.usingAi, personsQuery.total, size]);

  const shouldShowEmpty =
    !aiState.usingAi &&
    !manualFilters.search.trim() &&
    (manualFilters.serverFilters || []).length === 0 &&
    (personsQuery.total || 0) === 0;

  const pageLoading =
    !hasInitialLoaded && (crm.loading || personsQuery.loading);

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
        onClearAi={aiState.clearAi}
        onAskAi={aiState.openPrompt}
      />

      {shouldShowEmpty && (
        <Empty text="You don't have any CRM responses yet." />
      )}

      <CrmImportProgressAlerts imports={personsQuery.imports} />

      <CrmPersonsTable
        data={aiState.usingAi ? filteredPersons : personsQuery.crmPersons}
        columns={columnConfig.visibleColumns}
        page={aiState.usingAi ? undefined : page}
        size={aiState.usingAi ? undefined : size}
        totalRows={aiState.usingAi ? undefined : personsQuery.total}
        onSetPage={aiState.usingAi ? undefined : handlePageChange}
        onSetSize={aiState.usingAi ? undefined : handleSizeChange}
        orderBy={aiState.usingAi ? undefined : orderBy}
        order={aiState.usingAi ? undefined : order}
        onSetOrder={aiState.usingAi ? undefined : handleOrderChange}
        loading={hasInitialLoaded && busy}
      />
    </EventPage>
  );
};
