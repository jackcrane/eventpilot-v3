import { Card, Typography } from "tabler-react-2";
import { useParams } from "react-router-dom";
import { DataBox } from "../dataBox/DataBox";
import { useDashUpsellUsage } from "../../hooks/useDashUpsellUsage";

export const UpsellUsageCard = () => {
  const { eventId } = useParams();
  const { total, withUpsells, percent, loading } = useDashUpsellUsage({ eventId });

  if (loading) return null;

  const value = percent == null ? "N/A" : `${percent.toFixed(1)}%`;

  return (
    <Card title="Upsell Adoption" style={{ width: 300, minWidth: 300 }}>
      <DataBox title="Participants with Upsells" value={value} />
      <Typography.Text>
        {withUpsells} of {total} finalized registrations purchased at least one upsell.
      </Typography.Text>
    </Card>
  );
};
