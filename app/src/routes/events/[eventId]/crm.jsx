// EventCrm.jsx
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EventPage } from "../../../../components/eventPage/EventPage";
import { useCrm } from "../../../../hooks/useCrm";
import { Empty } from "../../../../components/empty/Empty";
import {
  Table,
  Button,
  useOffcanvas,
  Alert,
  Spinner,
  Typography,
  Dropdown,
  Badge,
  Util,
  Input,
} from "tabler-react-2";
import { Icon } from "../../../../util/Icon";
import { CrmPersonCRUD } from "../../../../components/crmPersonCRUD/crmPersonCRUD";
import { useCrmPersons } from "../../../../hooks/useCrmPersons";
import { Row } from "../../../../util/Flex";
import { useCrmGenerativeSegment } from "../../../../hooks/useCrmGenerativeSegment";
import { useCrmSavedSegments } from "../../../../hooks/useCrmSavedSegments";
import { CrmPersonsImport } from "../../../../components/crmPersonsImport/CrmPersonsImport";
import moment from "moment";
import { useCrmFields } from "../../../../hooks/useCrmFields";
import { Filters } from "../../../../components/filters/Filters";
import { ColumnsPicker } from "../../../../components/columnsPicker/ColumnsPicker";

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
  const { crmFields, loading: fieldsLoading } = useCrm({ eventId });
  const {
    crmPersons,
    loading: personsLoading,
    imports,
  } = useCrmPersons({ eventId });
  const { offcanvas, OffcanvasElement, close } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1051 },
  });
  const { createCrmFieldModal, CreateCrmFieldModalElement, mutationLoading } =
    useCrmFields({ eventId });

  const [filters, setFilters] = useState([]);
  const [search, setSearch] = useState("");

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
  const { generate: generateSegment, loading: generating } =
    useCrmGenerativeSegment({ eventId });
  const { createSavedSegment, updateSavedSegment, suggestTitle } = useCrmSavedSegments({ eventId });

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

  const openAiOffcanvas = (opts = {}) => {
    const AiContent = () => {
      const [title, setTitle] = useState(opts?.title || "");
      const [prompt, setPrompt] = useState(opts?.prompt || "");
      return (
        <div>
          <Typography.H5 className="mb-0 text-secondary">
            DESCRIBE YOUR SEGMENT
          </Typography.H5>
          <Typography.H1>Find what you need with AI</Typography.H1>
          <div className="mb-2">
            <label className="form-label">Title (optional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 2024 Half - Last Minute"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <Typography.Text>
            Tell the AI who you want to find. Include iteration context (e.g.,
            this year, previous, instance name), participant vs volunteer, tiers
            or periods by name, and any NOT conditions.
          </Typography.Text>
          <textarea
            className="form-control"
            rows={6}
            placeholder="e.g. Participants in 2024 who registered during Last Minute for the Half Marathon"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{ marginTop: 8 }}
          />
          <div className="mt-3">
            <Typography.H4 className="mb-2">Best practices</Typography.H4>
            <ul className="mb-3">
              <li>
                State the iteration clearly (current, previous, name, or year).
              </li>
              <li>Use exact tier/period names shown in your event.</li>
              <li>Mention role (participant vs volunteer) explicitly.</li>
              <li>Use NOT for exclusions (e.g., not this iteration).</li>
              <li>Prefer instance name when a year has multiple instances.</li>
            </ul>
          </div>

          <Button
            variant="primary"
            loading={generating}
            onClick={async () => {
              const res = await generateSegment({ prompt, debug: false });
              if (res?.ok && res?.results) {
                setAiResults(res.results);
                setLastPrompt(prompt);
                setLastAst(res.segment);
                // Save to DB regardless of title presence
                const saved = await createSavedSegment({
                  title,
                  prompt,
                  ast: res.segment,
                });
                if (saved?.ok && saved?.savedSegment) {
                  setCurrentSavedId(saved.savedSegment.id);
                  let t = saved.savedSegment.title || "";
                  // If no title was provided, suggest one via separate request and persist it
                  if (!t) {
                    const suggestion = await suggestTitle({ prompt, ast: res.segment });
                    if (suggestion?.ok && suggestion?.title) {
                      const upd = await updateSavedSegment(saved.savedSegment.id, { title: suggestion.title });
                      if (upd?.ok && upd?.savedSegment) {
                        t = upd.savedSegment.title || suggestion.title;
                      } else {
                        t = suggestion.title;
                      }
                    }
                  }
                  setSavedTitle(t);
                }
                close();
              }
            }}
          >
            Generate
          </Button>
        </div>
      );
    };

    offcanvas({ content: <AiContent /> });
  };

  const openSaveTitleOffcanvas = () => {
    const SaveTitleContent = () => {
      const [title, setTitle] = useState(savedTitle || "");
      return (
        <div>
          <Typography.H5 className="mb-0 text-secondary">SAVE SEARCH</Typography.H5>
          <Typography.H1>Add a title</Typography.H1>
          <div className="mb-2">
            <label className="form-label">Title</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 2024 Half - Last Minute"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <Button
            variant="primary"
            onClick={async () => {
              if (!currentSavedId) {
                // Create now using lastPrompt/lastAst
                const saved = await createSavedSegment({
                  title,
                  prompt: lastPrompt,
                  ast: lastAst,
                });
                if (saved?.ok && saved?.savedSegment) {
                  setCurrentSavedId(saved.savedSegment.id);
                  setSavedTitle(saved.savedSegment.title || "");
                }
              } else {
                const updated = await updateSavedSegment(currentSavedId, { title });
                if (updated?.ok && updated?.savedSegment) {
                  setSavedTitle(updated.savedSegment.title || "");
                }
              }
              close();
            }}
          >
            Save
          </Button>
        </div>
      );
    };
    offcanvas({ content: <SaveTitleContent /> });
  };

  const visibleColumns = columnConfig
    .filter((c) => c.show)
    .sort((a, b) => a.order - b.order)
    .map(({ id, label, show, order, ...rest }) => ({ label, ...rest }));

  return (
    <EventPage
      title="CRM"
      loading={fieldsLoading || personsLoading}
      docsLink="https://docs.geteventpilot.com/docs/pages/crm/"
      description={
        "This is the contacts page. It is a powerful CRM for managing your event's contacts."
      }
    >
      {OffcanvasElement}
      {CreateCrmFieldModalElement}

      <Row gap={1} justify="flex-end" className="mb-3">
        <ColumnsPicker
          columns={columnConfig}
          onColumnsChange={setColumnConfig}
        />
        <Dropdown
          prompt="Create/Import Contacts"
          items={[
            {
              text: "Create a Contact",
              onclick: () => offcanvas({ content: <CrmPersonCRUD /> }),
            },
            {
              text: "Import Contacts from CSV",
              onclick: () =>
                offcanvas({
                  content: (
                    <CrmPersonsImport
                      createCrmFieldModal={createCrmFieldModal}
                      CreateCrmFieldModalElement={CreateCrmFieldModalElement}
                    />
                  ),
                }),
            },
          ]}
        />
        <Button onClick={createCrmFieldModal} loading={mutationLoading}>
          Create a Field
        </Button>
      </Row>

      <Util.Hr style={{ margin: "1rem 0" }} />

      {crmPersons?.length > 0 && (
        <Row gap={1} className="mb-3" align="center">
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={setSearch}
            className="mb-0"
            style={{ minWidth: 240 }}
          />
          <Filters onFilterChange={setFilters} fields={filterFieldDefs} />
          <Button variant="outline" onClick={openAiOffcanvas}>
            <Icon i="sparkles" /> Ask AI
          </Button>
        </Row>
      )}

      {crmPersons?.length === 0 && (
        <Empty text="You don't have any CRM responses yet." />
      )}

      {imports.map((i) => (
        <Alert
          variant="info"
          title={
            <Row gap={1} align="center">
              <Spinner size="sm" />
              <Typography.H3 className="ml-2 mb-0">Importing</Typography.H3>
            </Row>
          }
          key={i.createdAt}
        >
          An import is currently running. It started{" "}
          {moment(i.createdAt).fromNow()} and is{" "}
          {Math.round((i.completed / i.total) * 100)}% complete.
        </Alert>
      ))}

      {aiResults && (
        <Alert
          variant="info"
          title={`Showing AI segment results (${ 
            aiResults.total || (aiResults.crmPersons || []).length
          })`}
        >
          <Row gap={1}>
            <Typography.Text className="mb-0">
              You can refine your prompt and run again.
            </Typography.Text>
            {savedTitle && (
              <Typography.B className="mb-0 ml-2">Title: {savedTitle}</Typography.B>
            )}
            {!currentSavedId && (
              <Button size="sm" onClick={openSaveTitleOffcanvas}>
                Save Prompt
              </Button>
            )}
            {currentSavedId && !savedTitle && (
              <Button size="sm" onClick={openSaveTitleOffcanvas}>Add Title</Button>
            )}
            {currentSavedId && savedTitle && (
              <Button size="sm" onClick={openSaveTitleOffcanvas}>Rename</Button>
            )}
          </Row>
        </Alert>
      )}

      {(filteredPersons || []).length > 0 && (
        <Table
          className="card"
          showPagination={(filteredPersons || []).length > 10}
          columns={visibleColumns}
          data={filteredPersons}
        />
      )}
    </EventPage>
  );
};
