import { Card, Typography } from "tabler-react-2";
import { useParams } from "react-router-dom";
import { DataBox } from "../dataBox/DataBox";
import { useDashVolunteerCapacity } from "../../hooks/useDashVolunteerCapacity";

const pct = (v) => (v == null ? "N/A" : `${v.toFixed(1)}%`);

export const VolunteerCapacityCard = () => {
  const { eventId } = useParams();
  const { jobs, shifts, note, previous, loading } = useDashVolunteerCapacity({ eventId });

  if (loading) return null;

  const jobsLine = jobs ? `${pct(jobs.percent)}` : "N/A";
  const shiftsLine = shifts ? `${pct(shifts.percent)}` : "N/A";

  const allUnlimited = (jobs?.total || 0) + (shifts?.total || 0) === 0;

  const jobsDesc =
    previous?.jobs && typeof previous.jobs.filled === "number" && previous.jobs.filled > 0
      ? `vs last: ${pct(previous.jobs.percent)} (${previous.jobs.filled} of ${previous.jobs.total})`
      : undefined;
  const shiftsDesc =
    previous?.shifts && typeof previous.shifts.filled === "number" && previous.shifts.filled > 0
      ? `vs last: ${pct(previous.shifts.percent)} (${previous.shifts.filled} of ${previous.shifts.total})`
      : undefined;

  const jobsTrend = (() => {
    const prevPct = previous?.jobs?.total > 0 ? previous.jobs.percent ?? null : null;
    const curPct = jobs?.percent ?? null;
    return prevPct != null && curPct != null
      ? {
          previousAsOf: prevPct,
          delta: curPct - prevPct,
          percentChange: prevPct > 0 ? ((curPct - prevPct) / prevPct) * 100 : null,
        }
      : {}; // trigger grey message when no data
  })();

  const shiftsTrend = (() => {
    const prevPct = previous?.shifts?.total > 0 ? previous.shifts.percent ?? null : null;
    const curPct = shifts?.percent ?? null;
    return prevPct != null && curPct != null
      ? {
          previousAsOf: prevPct,
          delta: curPct - prevPct,
          percentChange: prevPct > 0 ? ((curPct - prevPct) / prevPct) * 100 : null,
        }
      : {}; // trigger grey message when no data
  })();

  return (
    <Card title="Volunteer Capacity" style={{ width: 300, minWidth: 300 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <DataBox title="Jobs Filled" value={jobsLine} description={jobsDesc} trend={jobsTrend} />
        </div>
        <div style={{ flex: 1 }}>
          <DataBox title="Shifts Filled" value={shiftsLine} description={shiftsDesc} trend={shiftsTrend} />
        </div>
      </div>
      <Typography.Text>
        {allUnlimited
          ? "All jobs and shifts have unlimited capacity"
          : note || null}
      </Typography.Text>
    </Card>
  );
};
