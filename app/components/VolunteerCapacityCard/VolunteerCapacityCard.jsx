import { Card, Typography } from "tabler-react-2";
import { useParams } from "react-router-dom";
import { DataBox } from "../dataBox/DataBox";
import { useDashVolunteerCapacity } from "../../hooks/useDashVolunteerCapacity";

const pct = (v) => (v == null ? "N/A" : `${v.toFixed(1)}%`);

export const VolunteerCapacityCard = () => {
  const { eventId } = useParams();
  const { jobs, shifts, note, loading } = useDashVolunteerCapacity({ eventId });

  if (loading) return null;

  const jobsLine = jobs ? `${pct(jobs.percent)}` : "N/A";
  const shiftsLine = shifts ? `${pct(shifts.percent)}` : "N/A";

  const allUnlimited = (jobs?.total || 0) + (shifts?.total || 0) === 0;

  return (
    <Card title="Volunteer Capacity" style={{ width: 300, minWidth: 300 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <DataBox title="Jobs Filled" value={jobsLine} />
        </div>
        <div style={{ flex: 1 }}>
          <DataBox title="Shifts Filled" value={shiftsLine} />
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
