import { Card, Typography } from "tabler-react-2";
import { useParams } from "react-router-dom";
import { DataBox } from "../dataBox/DataBox";
import { useDashCrm } from "../../hooks/useDashCrm";

export const CrmTotalCard = () => {
  const { eventId } = useParams();
  const { totalCrm, loading } = useDashCrm({ eventId });

  if (loading) return null;

  const formatted = new Intl.NumberFormat("en-US").format(Number(totalCrm || 0));

  return (
    <Card title="CRM People" style={{ width: 300, minWidth: 300 }}>
      <DataBox title="Total" value={formatted} />
      <Typography.Text>
        Event-level CRM contacts across all instances.
      </Typography.Text>
    </Card>
  );
};
