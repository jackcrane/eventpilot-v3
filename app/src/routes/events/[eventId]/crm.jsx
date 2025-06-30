import { useParams } from "react-router-dom";
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
import { CrmPersonCRUD } from "../../../../components/crmPersonCRUD/CrmPersonCRUD";
import { useCrmPersons } from "../../../../hooks/useCrmPersons";
import { Row } from "../../../../util/Flex";
import { CrmPersonsImport } from "../../../../components/crmPersonsImport/CrmPersonsImport";
import moment from "moment";
import { useCrmFields } from "../../../../hooks/useCrmFields";
import { Filters } from "../../../../components/filters/Filters";
import { useState, useMemo } from "react";

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
  const { crmFields, loading } = useCrm({ eventId });
  const {
    crmPersons,
    loading: crmPersonsLoading,
    imports,
  } = useCrmPersons({ eventId });
  const { offcanvas, OffcanvasElement } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500 },
  });
  const { createCrmFieldModal, CreateCrmFieldModalElement, mutationLoading } =
    useCrmFields({ eventId });

  // Filter state
  const [filters, setFilters] = useState([]);

  // Applies all active filters to the CRM persons array
  const filteredPersons = useMemo(() => {
    if (!filters.length) return crmPersons;
    return crmPersons.filter((person) => {
      return filters.every(({ field, operation, value }) => {
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
      });
    });
  }, [crmPersons, filters]);

  return (
    <EventPage title="CRM" loading={loading || crmPersonsLoading}>
      {OffcanvasElement}
      {CreateCrmFieldModalElement}

      <Row gap={1} justify="flex-end" className="mb-3">
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

      <Row gap={1} className="mb-3">
        <Filters onFilterChange={setFilters} />
      </Row>

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

      <Table
        className="card"
        showPagination={filteredPersons?.length > 10}
        columns={[
          {
            label: "Name",
            accessor: "name",
            sortable: true,
            icon: <Icon i="id-badge-2" />,
          },
          {
            label: "Email",
            accessor: "emails",
            render: (v) => v.map((e) => e.email).join(", "),
            sortable: true,
            icon: <Icon i="mail" />,
          },
          {
            label: "Phone",
            accessor: "phones",
            render: (v) => v.map((p) => p.phone).join(", "),
            sortable: true,
            icon: <Icon i="phone" />,
          },
          ...(Array.isArray(crmFields)
            ? crmFields
                .filter((f) => f.showInGeneralTable)
                .sort((a, b) => a.generalTableOrder - b.generalTableOrder)
                .map((f) => ({
                  label: f.label,
                  accessor: `fields.${f.id}`,
                  render: (v) => {
                    if (f.type === "DATE") {
                      return new Date(v).toLocaleDateString();
                    }
                    return v;
                  },
                  sortable: true,
                  sortFn: (a, b) => {
                    if (f.type === "DATE") {
                      let c = new Date(a).getTime();
                      let d = new Date(b).getTime();
                      if (!c) return 1;
                      if (!d) return -1;
                      return c - d;
                    }

                    if (f.type === "NUMBER") {
                      let c = parseFloat(a);
                      let d = parseFloat(b);
                      if (!c) return 1;
                      if (!d) return -1;
                      return c - d;
                    }

                    if (f.type === "BOOLEAN") {
                      return a === "true" ? 1 : -1;
                    }

                    return a - b;
                  },
                  icon: <Icon i={switchTypeForIcon(f.type)} />,
                }))
            : []),
          {
            label: "Created At",
            accessor: "createdAt",
            render: (v) => new Date(v).toLocaleDateString(),
            sortable: true,
            icon: <Icon i="calendar" />,
          },
          {
            label: "Source",
            accessor: "source",
            render: (v) => <Badge outline>{v}</Badge>,
            sortable: true,
          },
          {
            label: "Actions",
            accessor: "id",
            render: (id, row) => (
              <Button
                size="sm"
                onClick={() => {
                  offcanvas({
                    content: <CrmPersonCRUD crmPersonId={id} />,
                  });
                }}
              >
                <Icon i="info-circle" /> Details
              </Button>
            ),
          },
        ]}
        data={filteredPersons}
      />
    </EventPage>
  );
};
