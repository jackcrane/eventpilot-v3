import { Card, Typography } from "tabler-react-2";
import { useParams } from "react-router-dom";
import { DataBox } from "../dataBox/DataBox";
import { useDashCouponUsage } from "../../hooks/useDashCouponUsage";

export const CouponUsageCard = () => {
  const { eventId } = useParams();
  const { total, used, percent, loading } = useDashCouponUsage({ eventId });

  if (loading) return null;

  const value = percent == null ? "N/A" : `${percent.toFixed(1)}%`;

  return (
    <Card title="Coupon Usage" style={{ width: 300, minWidth: 300 }}>
      <DataBox title="Participants with Coupon" value={value} />
      <Typography.Text>
        {used} of {total} finalized registrations used a coupon.
      </Typography.Text>
    </Card>
  );
};
