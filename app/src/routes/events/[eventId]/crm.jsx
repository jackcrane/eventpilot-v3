// EventCrm.jsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EventPage } from "../../../../components/eventPage/EventPage";
import { useCrm } from "../../../../hooks/useCrm";
import { Empty } from "../../../../components/empty/Empty";
import { Button, useOffcanvas, Badge, Util } from "tabler-react-2";
import { Icon } from "../../../../util/Icon";
import { useCrmPersons } from "../../../../hooks/useCrmPersons";
import { useCrmSavedSegments } from "../../../../hooks/useCrmSavedSegments";
import { useCrmSegment } from "../../../../hooks/useCrmSegment";
import { useCrmFields } from "../../../../hooks/useCrmFields";
// filterStyles moved into AiSegmentBadge component
import { AiSegmentPromptPanel } from "../../../../components/crmAi/AiSegmentPromptPanel";
import { AiSegmentRefinePanel } from "../../../../components/crmAi/AiSegmentRefinePanel";
import { useDbState } from "../../../../hooks/useDbState";
// classNames no longer used here (used inside AiSegmentBadge)
import { CrmHeaderActions } from "../../../../components/crm/CrmHeaderActions";
import { CrmFilterBar } from "../../../../components/crm/CrmFilterBar";
import { CrmImportProgressAlerts } from "../../../../components/crm/CrmImportProgressAlerts";
import { CrmPersonsTable } from "../../../../components/crm/CrmPersonsTable";
import toast from "react-hot-toast";

const switchTypeForIcon = (type) => {
  switch (type) {
    case "TEXT":
      return "cursor-text";
    case "EMAIL":
      return "mail";
    case "PHONE":
      return "phone";
    case "BOOLEAN":
      return "toggle-left";
    case "DATE":
      return "calendar";
    case "NUMBER":
      return "number";
    default:
      return "alert-hexagon";
  }
};

export const EventCrm = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { crmFields, loading: fieldsLoading, validating: fieldsValidating } = useCrm({ eventId });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [orderBy, setOrderBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const { offcanvas, OffcanvasElement, close } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1051 },
  });
  const { createCrmFieldModal, CreateCrmFieldModalElement, mutationLoading } =
    useCrmFields({ eventId });

  const [filters, setFilters] = useState([]);
  const [search, setSearch] = useState("");
  // Persisted CRM filter state (manual + AI)
  const [dbFilters, setDbFilters] = useDbState(
    {
      manual: { search: "", filters: [] },
      ai: { enabled: false, savedSegmentId: null, ast: null, title: "" },
    },
    "crmFilters"
  );
  const [hydratedManual, setHydratedManual] = useState(false);
  const [hydratedAi, setHydratedAi] = useState(false);

  // Build filter field definitions (base + dynamic custom fields)
  const filterFieldDefs = useMemo(() => {
    const base = [
      {
        label: "source",
        hrTitle: "Acquisition Source",
        type: "enum",
        options: [
          "MANUAL",
          "IMPORT",
          "VOLUNTEER",
          "REGISTRATION",
          "SENT_EMAIL",
          "EMAIL",
        ],
        defaultOperation: "eq",
      },
      {
        label: "createdAt",
        hrTitle: "Created Date",
        type: "date",
        defaultOperation: "date-after",
        accessor: (p) => p.createdAt,
      },
      {
        label: "updatedAt",
        hrTitle: "Updated Date",
        type: "date",
        defaultOperation: "date-after",
        accessor: (p) => p.updatedAt,
      },
      {
        label: "name",
        hrTitle: "Name",
        type: "text",
        defaultOperation: "contains",
        accessor: (p) => p.name,
      },
      {
        label: "emails",
        hrTitle: "Email",
        type: "text",
        defaultOperation: "contains",
        accessor: (p) => (p.emails || []).map((e) => e.email).join(", "),
      },
      {
        label: "phones",
        hrTitle: "Phone",
        type: "text",
        defaultOperation: "contains",
        accessor: (p) => (p.phones || []).map((ph) => ph.phone).join(", "),
      },
      {
        label: "stripe_customerId",
        hrTitle: "Stripe Customer ID",
        type: "text",
        defaultOperation: "contains",
        accessor: (p) => p.stripe_customerId,
      },
    ];

    const mapType = (t) => {
      switch (t) {
        case "DATE":
          return "date";
        case "NUMBER":
          return "number";
        case "BOOLEAN":
          return "boolean";
        default:
          return "text"; // TEXT, EMAIL, PHONE, ADDRESS -> text search
      }
    };

    const dynamic = (crmFields || []).map((f) => ({
      label: f.label,
      hrTitle: f.label,
      type: mapType(f.type),
      defaultOperation:
        f.type === "DATE"
          ? "date-after"
          : f.type === "NUMBER"
          ? "greater-than"
          : f.type === "BOOLEAN"
          ? "eq"
          : "contains",
      options: f.type === "BOOLEAN" ? ["true", "false"] : undefined,
      accessor: (p) => p?.fields?.[f.id],
    }));

    return [...base, ...dynamic];
  }, [crmFields]);

  // Hydrate manual filters from db once definitions are ready
  useEffect(() => {
    if (hydratedManual) return;
    const m = dbFilters?.manual;
    if (!m) return;
    setSearch(m.search || "");
    setHydratedManual(true);
  }, [dbFilters, hydratedManual]);

  // Persist manual filters + search on change
  useEffect(() => {
    if (!hydratedManual) return;
    const minimal = (filters || []).map((f) => ({
      label: f?.field?.label,
      operation: f?.operation,
      value: f?.value ?? null,
    }));
    setDbFilters((prev) => ({
      ...(prev || {}),
      manual: { search: search || "", filters: minimal },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, search]);

  const [columnConfig, setColumnConfig] = useState([
    {
      id: "actions",
      label: "Actions",
      order: 6,
      show: true,
      accessor: "id",
      render: (id) => (
        <Button
          size="sm"
          onClick={() => navigate(`/events/${eventId}/crm/${id}`)}
        >
          <Icon i="info-circle" /> Details
        </Button>
      ),
      sortable: false,
    },
    {
      id: "name",
      label: "Name",
      order: 1,
      show: true,
      accessor: "name",
      sortable: true,
      icon: <Icon i="id-badge-2" />,
    },
    {
      id: "emails",
      label: "Email",
      order: 2,
      show: true,
      accessor: "emails",
      render: (v) => v.map((e) => e.email).join(", "),
      sortable: true,
      icon: <Icon i="mail" />,
    },
    {
      id: "phones",
      label: "Phone",
      order: 3,
      show: true,
      accessor: "phones",
      render: (v) => v.map((p) => p.phone).join(", "),
      sortable: true,
      icon: <Icon i="phone" />,
    },
    {
      id: "createdAt",
      label: "Created At",
      order: 4,
      show: true,
      accessor: "createdAt",
      render: (v) => new Date(v).toLocaleDateString(),
      sortable: true,
      icon: <Icon i="calendar" />,
    },
    {
      id: "source",
      label: "Source",
      order: 5,
      show: true,
      accessor: "source",
      render: (v) => <Badge outline>{v}</Badge>,
      sortable: true,
    },
  ]);

  useEffect(() => {
    if (
      !fieldsLoading &&
      crmFields?.length > 0 &&
      !columnConfig.some((c) => c.id.startsWith("field-"))
    ) {
      const dynamic = crmFields.map((f, i) => ({
        id: `field-${f.id}`,
        label: f.label,
        order: 4 + i,
        show: f.showInGeneralTable,
        accessor: `fields.${f.id}`,
        render: (v) =>
          f.type === "DATE" ? new Date(v).toLocaleDateString() : v,
        sortable: true,
        sortFn:
          f.type === "DATE"
            ? (a, b) => {
                const ta = new Date(a).getTime();
                const tb = new Date(b).getTime();
                if (!ta) return 1;
                if (!tb) return -1;
                return ta - tb;
              }
            : f.type === "NUMBER"
            ? (a, b) => {
                const na = parseFloat(a);
                const nb = parseFloat(b);
                if (!na) return 1;
                if (!nb) return -1;
                return na - nb;
              }
            : f.type === "BOOLEAN"
            ? (a, b) => (a === "true" ? 1 : -1)
            : undefined,
        icon: <Icon i={switchTypeForIcon(f.type)} />,
      }));

      const idx = columnConfig.findIndex((c) => c.id === "phones");
      const merged = [
        ...columnConfig.slice(0, idx + 1),
        ...dynamic,
        ...columnConfig.slice(idx + 1),
      ].map((c, i) => ({ ...c, order: i + 1 }));

      setColumnConfig(merged);
    }
  }, [fieldsLoading, crmFields, columnConfig, offcanvas]);

  // AI segment support
  const [aiResults, setAiResults] = useState(null); // { crmPersons, total, debug? }
  const [currentSavedId, setCurrentSavedId] = useState(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const [lastAst, setLastAst] = useState(null);
  const [savedTitle, setSavedTitle] = useState("");
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const { savedSegments } = useCrmSavedSegments({ eventId });
  const { run: runSavedSegment } = useCrmSegment({
    eventId,
  });

  // Hydrate AI filter from db on first render
  useEffect(() => {
    if (hydratedAi) return;
    const ai = dbFilters?.ai;
    if (!ai || !ai.enabled) return;
    const run = async () => {
      const filter = ai?.ast?.filter || ai?.ast;
      if (!filter && !ai?.savedSegmentId) return;
      let res = null;
      let segForPrompt = null;
      if (filter) {
        res = await runSavedSegment({ filter, debug: !!ai?.ast?.debug });
      } else if (ai?.savedSegmentId) {
        const seg = (savedSegments || []).find(
          (s) => s.id === ai.savedSegmentId
        );
        if (seg) {
          segForPrompt = seg;
          res = await runSavedSegment({ filter: seg?.ast?.filter || seg?.ast });
        }
      }
      if (res?.ok) {
        setAiResults(res);
        setCurrentSavedId(ai.savedSegmentId || null);
        setSavedTitle(ai.title || segForPrompt?.title || "");
        setLastAst(ai.ast || segForPrompt?.ast || null);
        if (segForPrompt?.prompt) setLastPrompt(segForPrompt.prompt);
      }
      setHydratedAi(true);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbFilters, savedSegments, hydratedAi]);

  // Backfill prompt from savedSegments once they load if missing
  useEffect(() => {
    if (lastPrompt && lastPrompt.trim()) return;
    if (!currentSavedId) return;
    const seg = (savedSegments || []).find((s) => s.id === currentSavedId);
    if (seg?.prompt) setLastPrompt(seg.prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSegments, currentSavedId]);

  // Determine if AI is active; AI uses a separate endpoint
  const usingAi = !!aiResults;

  // Build server filter payload from UI filters
  const serverFilters = useMemo(() => {
    if (!filters || !filters.length) return [];
    const dynamicMap = new Map((crmFields || []).map((f) => [f.label, f.id]));
    return filters.map((f) => {
      const label = f?.field?.label;
      const fieldId = dynamicMap.get(label);
      const path = fieldId ? `fields.${fieldId}` : label; // built-in labels pass through
      return { path, operation: f?.operation, value: f?.value ?? null };
    });
  }, [filters, crmFields]);

  // Fetch CRM persons, optionally paginated when not using advanced filters
  const {
    crmPersons,
    total: totalRows,
    loading: personsLoading,
    validating: personsValidating,
    imports,
  } = useCrmPersons({
    eventId,
    page: usingAi ? undefined : page,
    size: usingAi ? undefined : size,
    orderBy: usingAi ? undefined : orderBy,
    order: usingAi ? undefined : order,
    q: usingAi ? undefined : search,
    filters: usingAi ? undefined : serverFilters,
  });

  const filteredPersons = useMemo(() => {
    const baseList = aiResults?.crmPersons || crmPersons;
    if (!baseList) return baseList;

    const q = (search || "").trim().toLowerCase();
    const base = q
      ? baseList.filter((p) => {
          const hay = [
            p.name,
            p.source,
            (p.emails || []).map((e) => e.email).join(" "),
            (p.phones || []).map((ph) => ph.phone).join(" "),
            ...Object.values(p.fields || {}),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        })
      : baseList;

    if (!filters.length) return base;

    return base.filter((person) =>
      filters.every(({ field, operation, value }) => {
        const raw = field?.accessor
          ? field.accessor(person)
          : person[field?.label];
        const exists = (r) => {
          if (r == null) return false;
          if (Array.isArray(r)) return r.length > 0;
          if (typeof r === "string") return r.trim() !== "";
          return true;
        };

        if (operation === "exists") {
          return exists(raw);
        }
        if (operation === "not-exists") {
          return !exists(raw);
        }

        if (raw == null || value == null || value === "") return true;
        const val = String(raw).toLowerCase();
        const query = String(value).toLowerCase();
        switch (operation) {
          case "eq":
            return val === query;
          case "neq":
            return val !== query;
          case "contains":
            return val.includes(query);
          case "not-contains":
            return !val.includes(query);
          case "starts-with":
            return val.startsWith(query);
          case "ends-with":
            return val.endsWith(query);
          case "greater-than":
            return parseFloat(val) > parseFloat(query);
          case "greater-than-or-equal":
            return parseFloat(val) >= parseFloat(query);
          case "less-than":
            return parseFloat(val) < parseFloat(query);
          case "less-than-or-equal":
            return parseFloat(val) <= parseFloat(query);
          case "date-after": {
            const dv = new Date(val).getTime();
            const dq = new Date(query).getTime();
            if (!dv || !dq) return true;
            return dv > dq;
          }
          case "date-before": {
            const dv = new Date(val).getTime();
            const dq = new Date(query).getTime();
            if (!dv || !dq) return true;
            return dv < dq;
          }
          default:
            return true;
        }
      })
    );
  }, [crmPersons, aiResults, filters, search]);

  // Legacy AI offcanvas implementation removed (replaced by AiSegmentPromptPanel)

  // Refactored AI prompt offcanvas content using dedicated component
  const openAiOffcanvasRefactored = (opts = {}) => {
    offcanvas({
      content: (
        <AiSegmentPromptPanel
          eventId={eventId}
          initialTitle={opts?.title || ""}
          initialPrompt={opts?.prompt || ""}
          onApply={({ results, savedSegmentId, ast, title, prompt }) => {
            if (results) setAiResults(results);
            setCurrentSavedId(savedSegmentId || null);
            setSavedTitle(title || "");
            setLastAst(ast || null);
            setLastPrompt(prompt || "");
            if (savedSegmentId || ast) {
              setDbFilters((prev) => ({
                ...(prev || {}),
                ai: {
                  enabled: true,
                  savedSegmentId: savedSegmentId || null,
                  ast: ast || null,
                  title: title || "",
                },
              }));
            }
          }}
          onClose={close}
        />
      ),
    });
  };

  // Legacy save-title offcanvas removed (handled in refine/prompt components)

  // Refactored AI refine offcanvas using dedicated component
  const openAiRefineOffcanvasRefactored = () => {
    offcanvas({
      content: (
        <AiSegmentRefinePanel
          eventId={eventId}
          currentSavedId={currentSavedId}
          lastPrompt={lastPrompt}
          lastAst={lastAst}
          savedTitle={savedTitle}
          defaultTitle={dbFilters?.ai?.title || ""}
          onApply={({ results, savedSegmentId, ast, title, prompt }) => {
            if (results) setAiResults(results);
            if (savedSegmentId) setCurrentSavedId(savedSegmentId);
            setSavedTitle(title || "");
            setLastAst(ast || null);
            setLastPrompt(prompt || "");
            setDbFilters((prev) => ({
              ...(prev || {}),
              ai: {
                enabled: true,
                savedSegmentId:
                  savedSegmentId || prev?.ai?.savedSegmentId || null,
                ast: ast || prev?.ai?.ast || null,
                title: title || prev?.ai?.title || "",
              },
            }));
          }}
          onClose={close}
        />
      ),
    });
  };

  const visibleColumns = columnConfig
    .filter((c) => c.show)
    .sort((a, b) => a.order - b.order)
    .map(({ id, label, show, order, ...rest }) => ({ label, ...rest }));

  // Only show full-page loading on first load; thereafter show a toast during revalidations
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);
  const loadingToastId = useRef(null);
  const userRequestedRefetch = useRef(false);

  useEffect(() => {
    if (!hasInitialLoaded && !fieldsLoading && !personsLoading) {
      setHasInitialLoaded(true);
    }
  }, [hasInitialLoaded, fieldsLoading, personsLoading]);

  useEffect(() => {
    if (!hasInitialLoaded) return;
    const busy = fieldsLoading || personsLoading || fieldsValidating || personsValidating;
    if (busy && userRequestedRefetch.current) {
      if (!loadingToastId.current) {
        loadingToastId.current = toast.loading("Refreshing contacts...");
      }
    } else if (!busy && loadingToastId.current) {
      toast.dismiss(loadingToastId.current);
      loadingToastId.current = null;
      userRequestedRefetch.current = false;
    }
  }, [hasInitialLoaded, fieldsLoading, personsLoading, fieldsValidating, personsValidating]);

  return (
    <EventPage
      title="CRM"
      loading={!hasInitialLoaded && (fieldsLoading || personsLoading)}
      docsLink="https://docs.geteventpilot.com/docs/pages/crm/"
      description={
        "This is the contacts page. It is a powerful CRM for managing your event's contacts."
      }
    >
      {OffcanvasElement}
      {CreateCrmFieldModalElement}

      <CrmHeaderActions
        columnConfig={columnConfig}
        setColumnConfig={setColumnConfig}
        offcanvas={offcanvas}
        createCrmFieldModal={createCrmFieldModal}
        mutationLoading={mutationLoading}
        CreateCrmFieldModalElement={CreateCrmFieldModalElement}
      />

      <Util.Hr style={{ margin: "1rem 0" }} />

      <CrmFilterBar
        search={search}
        setSearch={(v) => {
          userRequestedRefetch.current = true;
          setSearch(v);
          setPage(1);
        }}
        filterFieldDefs={filterFieldDefs}
        setFilters={(v) => {
          userRequestedRefetch.current = true;
          setFilters(v);
          setPage(1);
        }}
        initialFilters={dbFilters?.manual?.filters || []}
        showAiBadge={dbFilters?.ai?.enabled || aiResults}
        aiTitle={
          savedTitle || dbFilters?.ai?.title || lastPrompt || "AI Filter"
        }
        aiCollapsed={aiCollapsed}
        onToggleAi={() => setAiCollapsed((c) => !c)}
        onRefineAi={openAiRefineOffcanvasRefactored}
        onClearAi={() => {
          setAiResults(null);
          setCurrentSavedId(null);
          setSavedTitle("");
          setLastAst(null);
          setLastPrompt("");
          setDbFilters((prev) => ({
            ...(prev || {}),
            ai: {
              enabled: false,
              savedSegmentId: null,
              ast: null,
              title: "",
            },
          }));
        }}
        onAskAi={openAiOffcanvasRefactored}
      />

      {(!usingAi && !search?.trim() && (serverFilters || []).length === 0 && (totalRows || 0) === 0) && (
        <Empty text="You don't have any CRM responses yet." />
      )}

      <CrmImportProgressAlerts imports={imports} />

      <CrmPersonsTable
        data={usingAi ? filteredPersons : crmPersons}
        columns={visibleColumns}
        {...(!usingAi
          ? {
              page,
              size,
              totalRows,
              onSetPage: (p) => {
                userRequestedRefetch.current = true;
                setPage(p);
              },
              onSetSize: (n) => {
                userRequestedRefetch.current = true;
                setSize(n);
                setPage(1);
              },
              orderBy,
              order,
              onSetOrder: (ob, ord) => {
                userRequestedRefetch.current = true;
                setOrderBy(ob);
                setOrder(ord);
                setPage(1);
              },
            }
          : {})}
      />
    </EventPage>
  );
};
