import { Card, Typography } from "tabler-react-2";
import { useParams } from "react-router-dom";
import { DataBox } from "../dataBox/DataBox";
import { useDashCouponUsage } from "../../hooks/useDashCouponUsage";

export const CouponUsageCard = () => {
  const { eventId } = useParams();
  const { total, used, percent, previous, loading } = useDashCouponUsage({ eventId });

  if (loading) return null;

  const value = percent == null ? "N/A" : `${percent.toFixed(1)}%`;
  const pct = (v) => (v == null ? "N/A" : `${v.toFixed(1)}%`);
  const hasPrevData =
    previous && typeof previous.used === "number" && previous.used > 0;
  const description = hasPrevData
    ? `vs last: ${pct(previous.percent)} (${previous.used} of ${previous.total})`
    : undefined;

  // Trend row like Team Joins: use previous percent for previousAsOf
  const hasPrev = previous && typeof previous.total === "number" && previous.total > 0;
  const prevPct = hasPrev ? previous.percent ?? null : null;
  const curPct = percent ?? null;
  const trend = hasPrev && prevPct != null && curPct != null
    ? {
        previousAsOf: prevPct,
        delta: curPct - prevPct,
        percentChange: prevPct > 0 ? ((curPct - prevPct) / prevPct) * 100 : null,
      }
    : {}; // empty object triggers "no historical trend data"

  return (
    <Card title="Coupon Usage" style={{ width: 300, minWidth: 300 }}>
      <DataBox title="Participants with Coupon" value={value} description={description} trend={trend} />
      <Typography.Text>
        {used} of {total} finalized registrations used a coupon.
      </Typography.Text>
    </Card>
  );
};
