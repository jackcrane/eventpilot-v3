import { useParams } from "react-router-dom";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { Table } from "tabler-react-2";
import { Row } from "../../../../../util/Flex";
import { TeamCRUDTrigger } from "../../../../../components/TeamCRUD/TeamCRUDTrigger";
import { TeamDeleteTrigger } from "../../../../../components/TeamDeleteTrigger/TeamDeleteTrigger";
import { useRegistrationTeams } from "../../../../../hooks/useRegistrationTeams";

export const TeamsPage = () => {
  const { eventId } = useParams();
  const { teams, loading } = useRegistrationTeams({ eventId });

  return (
    <EventPage title="Teams" loading={loading}>
      <TeamCRUDTrigger>Add Team</TeamCRUDTrigger>
      <div className="mt-3" />
      <div className="table-responsive">
        <Table
          className="card table-responsive"
          columns={[
            {
              label: "Edit",
              accessor: "id",
              render: (v, r) => (
                <Row gap={1} align="center">
                  <TeamCRUDTrigger size="sm" team={r}>
                    Edit
                  </TeamCRUDTrigger>
                  <TeamDeleteTrigger size="sm" teamId={r.id} eventId={eventId}>
                    Delete
                  </TeamDeleteTrigger>
                </Row>
              ),
            },
            { label: "Name", accessor: "name" },
            { label: "Code", accessor: "code" },
            {
              label: "Public",
              accessor: "public",
              render: (v) => (v ? "Yes" : "No"),
            },
            {
              label: "Max Size",
              accessor: "maxSize",
              render: (v) => (v ? v : "Unlimited"),
            },
            {
              label: "Members",
              accessor: "memberCount",
            },
            {
              label: "Spots Available",
              accessor: "__avail",
              render: (_, r) =>
                r.maxSize ? Math.max(0, r.maxSize - (r.memberCount || 0)) : "Unlimited",
            },
          ]}
          data={teams}
        />
      </div>
    </EventPage>
  );
};
