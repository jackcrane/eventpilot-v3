import { useParams } from "react-router-dom";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { UpsellCard } from "../../../../../components/UpsellCard/UpsellCard";
import { UpsellItemCRUDTrigger } from "../../../../../components/UpsellItemCRUD/UpsellItemCRUDTrigger";
import { useRegistrationUpsells } from "../../../../../hooks/useRegistrationUpsells";
import { Row } from "../../../../../util/Flex";
import { Table } from "tabler-react-2";
import { UpsellDeleteTrigger } from "../../../../../components/UpsellDeleteTrigger/UpsellDeleteTrigger";

export const UpsellsPage = () => {
  const { eventId } = useParams();
  const { upsells, loading } = useRegistrationUpsells({ eventId });

  return (
    <EventPage title="Upsells" loading={loading}>
      <UpsellItemCRUDTrigger>Add Upsell</UpsellItemCRUDTrigger>
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
                  <UpsellItemCRUDTrigger size="sm" upsellItem={r}>
                    Edit
                  </UpsellItemCRUDTrigger>
                  <UpsellDeleteTrigger
                    size="sm"
                    upsellItemId={r.id}
                    eventId={eventId}
                  >
                    Delete
                  </UpsellDeleteTrigger>
                </Row>
              ),
            },
            {
              label: "Name",
              accessor: "name",
            },
            {
              label: "Description",
              accessor: "description",
            },
            {
              label: "Price",
              accessor: "price",
              render: (v) => `$${Number(v).toFixed(2)}`,
            },
            {
              label: "Inventory",
              accessor: "inventory",
              render: (v) => (v === -1 ? "Unlimited" : v),
            },
          ]}
          data={upsells}
        />
      </div>
    </EventPage>
  );
};
