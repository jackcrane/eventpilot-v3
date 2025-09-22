import { useEffect, useMemo, useState } from "react";
import { useCrmPersons } from "./useCrmPersons";
import { filterPersons } from "../util/crm/filterPersons";

export const useCrmPageData = ({ eventId, controllers }) => {
  const { crm, manual, ai, columnConfig, aiCollapsed, toggleAiCollapsed, storedFilters } = controllers;

  const [page, setPage] = useState(1), [size, setSize] = useState(25);
  const [orderBy, setOrderBy] = useState("createdAt"), [order, setOrder] = useState("desc");

  const personsQuery = useCrmPersons({
    eventId,
    page: ai.usingAi ? undefined : page,
    size: ai.usingAi ? undefined : size,
    orderBy: ai.usingAi ? undefined : orderBy,
    order: ai.usingAi ? undefined : order,
    q: ai.usingAi ? undefined : manual.search,
    filters: ai.usingAi ? undefined : manual.serverFilters,
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

  const basePersons = ai.aiResults?.crmPersons || personsQuery.crmPersons;
  const filteredPersons = useMemo(
    () =>
      basePersons
        ? filterPersons({ persons: basePersons, filters: manual.filters, search: manual.search })
        : basePersons,
    [basePersons, manual.filters, manual.search]
  );

  const setSearch = (value) => {
    manual.setSearch(value);
    setPage(1);
  };
  const setFilters = (next) => {
    manual.setFilters(next);
    setPage(1);
  };
  const changePage = (next) => {
    setPage(next);
  };
  const changeSize = (next) => {
    setSize(next);
    setPage(1);
  };
  const changeOrder = (nextOrderBy, nextOrder) => {
    setOrderBy(nextOrderBy);
    setOrder(nextOrder);
    setPage(1);
  };

  useEffect(() => {
    if (ai.usingAi) return;
    if (!Number.isFinite(personsQuery.total)) return;
    if (!Number.isFinite(size) || size <= 0) return;
    const maxPage = Math.max(1, Math.ceil(personsQuery.total / size));
    setPage((prev) => (prev > maxPage ? maxPage : prev));
  }, [ai.usingAi, personsQuery.total, size]);

  const shouldShowEmpty = !ai.usingAi && !manual.search.trim() && (manual.serverFilters || []).length === 0 && (personsQuery.total || 0) === 0;

  return {
    eventPage: {
      loading: !hasInitialLoaded && (crm.loading || personsQuery.loading),
    },
    filterProps: {
      search: manual.search,
      setSearch,
      filterFieldDefs: manual.filterFieldDefs,
      setFilters,
      initialFilters: manual.initialFilters,
      showAiBadge: storedFilters?.ai?.enabled || ai.aiResults,
      aiTitle: ai.aiTitle,
      aiCollapsed,
      onToggleAi: toggleAiCollapsed,
      onRefineAi: ai.openRefine,
      onClearAi: ai.clearAi,
      onAskAi: ai.openPrompt,
    },
    tableProps: {
      data: ai.usingAi ? filteredPersons : personsQuery.crmPersons,
      columns: columnConfig.visibleColumns,
      page: ai.usingAi ? undefined : page,
      size: ai.usingAi ? undefined : size,
      totalRows: ai.usingAi ? undefined : personsQuery.total,
      onSetPage: ai.usingAi ? undefined : changePage,
      onSetSize: ai.usingAi ? undefined : changeSize,
      orderBy: ai.usingAi ? undefined : orderBy,
      order: ai.usingAi ? undefined : order,
      onSetOrder: ai.usingAi ? undefined : changeOrder,
      loading: hasInitialLoaded && busy,
    },
    imports: personsQuery.imports,
    shouldShowEmpty,
  };
};
