import { Card, Typography } from "tabler-react-2";
import { useParams } from "react-router-dom";
import { DataBox } from "../dataBox/DataBox";
import { useDashUpsellUsage } from "../../hooks/useDashUpsellUsage";

export const UpsellUsageCard = () => {
  const { eventId } = useParams();
  const { total, withUpsells, percent, previous, loading } = useDashUpsellUsage(
    { eventId }
  );

  if (loading) return null;

  const value = percent == null ? "N/A" : `${percent.toFixed(1)}%`;
  const pct = (v) => (v == null ? "N/A" : `${v.toFixed(1)}%`);
  const hasPrevData =
    previous &&
    typeof previous.withUpsells === "number" &&
    previous.withUpsells > 0;
  const description = hasPrevData
    ? `vs last: ${pct(previous.percent)} (${previous.withUpsells} of ${
        previous.total
      })`
    : undefined;

  // Trend row like Team Joins
  const hasPrev =
    previous && typeof previous.total === "number" && previous.total > 0;
  const prevPct = hasPrev ? previous.percent ?? null : null;
  const curPct = percent ?? null;
  const trend =
    hasPrev && prevPct != null && curPct != null
      ? {
          previousAsOf: prevPct,
          delta: curPct - prevPct,
          percentChange:
            prevPct > 0 ? ((curPct - prevPct) / prevPct) * 100 : null,
        }
      : {}; // empty object triggers "no historical trend data"

  return (
    <Card title="Upsell Adoption" style={{ width: 300, minWidth: 300 }}>
      <DataBox
        title="Participants with Upsells"
        value={value}
        trend={trend}
        vsLastString={pct(trend.previousAsOf)}
      />
      <Typography.Text>
        {withUpsells} of {total} finalized registrations purchased at least one
        upsell.
      </Typography.Text>
    </Card>
  );
};
