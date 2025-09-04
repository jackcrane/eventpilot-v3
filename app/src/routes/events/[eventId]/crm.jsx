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
} from "tabler-react-2";
import { Icon } from "../../../../util/Icon";
import { CrmPersonCRUD } from "../../../../components/crmPersonCRUD/crmPersonCRUD";
import { useCrmPersons } from "../../../../hooks/useCrmPersons";
import { Row } from "../../../../util/Flex";
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

  const [columnConfig, setColumnConfig] = useState([
    {
      id: "actions",
      label: "Actions",
      order: 6,
      show: true,
      accessor: "id",
      render: (id) => (
        <Button size="sm" onClick={() => navigate(`/events/${eventId}/crm/${id}`)}>
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
      crmFields.length > 0 &&
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

  const filteredPersons = useMemo(() => {
    if (!filters.length) return crmPersons;
    return crmPersons.filter((person) =>
      filters.every(({ field, operation, value }) => {
        const raw = person[field.label];
        if (raw == null || value == null) return true;
        const val = String(raw).toLowerCase();
        const q = String(value).toLowerCase();
        switch (operation) {
          case "eq":
            return val === q;
          case "neq":
            return val !== q;
          case "contains":
            return val.includes(q);
          case "not-contains":
            return !val.includes(q);
          case "starts-with":
            return val.startsWith(q);
          case "ends-with":
            return val.endsWith(q);
          case "greater-than":
            return parseFloat(val) > parseFloat(q);
          case "greater-than-or-equal":
            return parseFloat(val) >= parseFloat(q);
          case "less-than":
            return parseFloat(val) < parseFloat(q);
          case "less-than-or-equal":
            return parseFloat(val) <= parseFloat(q);
          case "date-after":
            return new Date(val) > new Date(q);
          case "date-before":
            return new Date(val) < new Date(q);
          default:
            return true;
        }
      })
    );
  }, [crmPersons, filters]);

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
        <Row gap={1} className="mb-3">
          <Filters onFilterChange={setFilters} />
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

      {crmPersons?.length > 0 && (
        <Table
          className="card"
          showPagination={filteredPersons?.length > 10}
          columns={visibleColumns}
          data={filteredPersons}
        />
      )}
    </EventPage>
  );
};
