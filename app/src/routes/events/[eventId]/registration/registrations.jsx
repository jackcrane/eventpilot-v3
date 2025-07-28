import { useParams } from "react-router-dom";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { useRegistrations } from "../../../../../hooks/useRegistrations";
import { Table } from "tabler-react-2";
import { Empty } from "../../../../../components/empty/Empty";

export const RegistrationsPage = () => {
  const { eventId } = useParams();
  const { loading, registrations, fields } = useRegistrations({ eventId });

  return (
    <EventPage title="Registrations" loading={loading}>
      {registrations?.length > 0 ? (
        <Table
          className="table-bordered"
          columns={fields?.map((field) => ({
            label: field.label,
            accessor: field.id,
          }))}
          data={registrations?.map((r) => r.responses)}
        />
      ) : (
        <Empty gradient={false} />
      )}
    </EventPage>
  );
};
