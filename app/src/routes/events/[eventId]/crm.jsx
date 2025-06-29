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
  Badge,
} from "tabler-react-2";
import { Icon } from "../../../../util/Icon";
import { CrmPersonCRUD } from "../../../../components/crmPersonCRUD/CrmPersonCRUD";
import { useCrmPersons } from "../../../../hooks/useCrmPersons";
import { Row } from "../../../../util/Flex";
import { CrmPersonsImport } from "../../../../components/crmPersonsImport/CrmPersonsImport";
import moment from "moment";

const switchTypeForIcon = (type) => {
  switch (type) {
    case "TEXT":
      return "text-box";
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
      return "text-box";
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

  return (
    <EventPage title="CRM" loading={loading || crmPersonsLoading}>
      {OffcanvasElement}
      <Row gap={1} justify="flex-end" className="mb-3">
        <Button onClick={() => offcanvas({ content: <CrmPersonsImport /> })}>
          Import Contacts from CSV
        </Button>
        <Button onClick={() => offcanvas({ content: <CrmPersonCRUD /> })}>
          Create a Contact
        </Button>
      </Row>

      {crmPersons?.length === 0 && (
        <>
          <Empty text="You don't have any CRM responses yet." />
        </>
      )}

      {imports.map((i) => (
        <Alert
          variant="info"
          title={
            <Row gap={1} align="center">
              <Spinner size="sm" />
              <Typography.H3 className={"ml-2 mb-0"}>Importing</Typography.H3>
            </Row>
          }
          key={i.createdAt}
        >
          An import is currently running. It may take a while to finish. It
          started {moment(i.createdAt).fromNow()} and is currently{" "}
          {Math.round((i.completed / i.total) * 100)}% complete. You will
          receive an email when all {i.total} contacts have been imported.
        </Alert>
      ))}

      <Table
        className="card pb-3"
        showPagination={true}
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
        data={crmPersons}
      />
    </EventPage>
  );
};
