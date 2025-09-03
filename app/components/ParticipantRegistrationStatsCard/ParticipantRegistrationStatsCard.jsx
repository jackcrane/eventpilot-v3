import { useParams } from "react-router-dom";
import { useDashParticipants } from "../../hooks/useDashParticipants";
import { TimeDataFrame } from "../TimeDataFrame/TimeDataFrame";
import { useSelectedInstance } from "../../contexts/SelectedInstanceContext";
import moment from "moment";
import { buildDate } from "../tzDateTime/tzDateTime";

export const ParticipantRegistrationStatsCard = () => {
  const { eventId } = useParams();
  const { participantRegistrations, registrationsByDay, previous } = useDashParticipants({
    eventId,
  });
  const { instance } = useSelectedInstance();

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
      series={registrationsByDay?.map((d) => ({
        date: d.date,
        count: d.count,
      }))}
      compareSeries={previous?.registrationsByDay?.map((d) => ({
        date: d.date,
        count: d.count,
      }))}
      unitSingular="Participant"
      unitPlural="Participants"
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
