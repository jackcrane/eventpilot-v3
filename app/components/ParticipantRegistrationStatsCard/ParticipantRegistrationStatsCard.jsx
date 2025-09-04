import { useParams } from "react-router-dom";
import { useDashParticipants } from "../../hooks/useDashParticipants";
import { TimeDataFrame } from "../TimeDataFrame/TimeDataFrame";
import { useSelectedInstance } from "../../contexts/SelectedInstanceContext";
import moment from "moment";
import { buildDate } from "../tzDateTime/tzDateTime";
import { useDbState } from "../../hooks/useDbState";

export const ParticipantRegistrationStatsCard = () => {
  const { eventId } = useParams();
  const { participantRegistrations, registrationsByDay, previous, trend, loading } = useDashParticipants({
    eventId,
  });
  const { instance } = useSelectedInstance();

  // Persisted UI preferences
  const [display, setDisplay] = useDbState("calendar", "participantStatsDisplayFormat");
  const [metric, setMetric] = useDbState("count", "participantStatsCalendarMetric");
  const [timeframe, setTimeframe] = useDbState("6", "participantStatsTimeframe");

  // Build inclusive day range highlight from instance start/end
  const start = buildDate(instance?.startTime, instance?.startTimeTz);
  const end = buildDate(instance?.endTime, instance?.endTimeTz);
  const highlightCells = (() => {
    if (!start || !end) return [];
    const s = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
    );
    const e = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
    );
    const out = [];
    for (
      let d = new Date(s);
      d <= e;
      d = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)
      )
    ) {
      out.push({ date: new Date(d), color: "var(--tblr-success)" });
    }
    return out;
  })();

  return (
    <TimeDataFrame
      title="Participant Registrations"
      totalTitle="Total Participants"
      total={participantRegistrations}
      trend={trend}
      loading={loading}
      loadingTitle="Loading participant stats"
      loadingText="Crunching registration activity and totals..."
      emptyTitle="No participant registrations yet"
      emptyText="Once participants start registering, their daily activity will appear here."
      series={registrationsByDay?.map((d) => ({
        date: d.date,
        count: d.count,
      }))}
      compareSeries={previous?.registrationsByDay?.map((d) => ({
        date: d.date,
        count: d.count,
      }))}
      enableCalendarChangeToggle={!!previous?.registrationsByDay?.length}
      unitSingular="Participant"
      unitPlural="Participants"
      defaultDisplay={display}
      defaultCalendarMetric={metric}
      defaultTimeframe={timeframe}
      onChangeDisplayFormat={(v) => setDisplay(v?.id)}
      onChangeCalendarMetric={(v) => setMetric(v?.id)}
      onChangeTimeframe={(v) => setTimeframe(v?.id)}
      anchorStartDate={buildDate(instance?.startTime, instance?.startTimeTz)}
      compareStartDate={
        previous?.instance
          ? buildDate(previous.instance.startTime, previous.instance.startTimeTz)
          : undefined
      }
      startDate={moment(buildDate(instance?.startTime, instance?.startTimeTz))
        .subtract(5, "months")
        .toDate()}
      endDate={moment(buildDate(instance?.endTime, instance?.endTimeTz))
        .add(1, "months")
        .toDate()}
      HighlightCells={highlightCells}
    />
  );
};
