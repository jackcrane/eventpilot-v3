import { Card, Typography } from "tabler-react-2";
import { useSelectedInstance } from "../../contexts/SelectedInstanceContext";
import { useInstance } from "../../hooks/useInstance";
import moment from "moment";
import { DataBox } from "../dataBox/DataBox";
import { Row } from "../../util/Flex";
import { formatDate } from "../tzDateTime/tzDateTime";

export const SelectedInstanceCard = () => {
  const { instance, eventId } = useSelectedInstance();
  return <InstanceCard instanceId={instance?.id} eventId={eventId} />;
};

export const InstanceCard = ({ instanceId, eventId }) => {
  const { instance, loading } = useInstance({ instanceId, eventId });

  if (loading || !instance) return null;

  return (
    <Card title="Instance" style={{ gridColumn: "2/4" }}>
      <DataBox title="Instance Name" value={instance?.name} />
      <Row gap={1} justify="space-between">
        <DataBox
          title="Start Time"
          value={formatDate(instance?.startTime, instance?.startTimeTz)}
        />
        <DataBox
          title="End Time"
          value={formatDate(instance?.endTime, instance?.endTimeTz)}
        />
      </Row>
    </Card>
  );
};
