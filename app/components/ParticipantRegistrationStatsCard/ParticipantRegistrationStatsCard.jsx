import { useParams } from "react-router-dom";
import { useDashParticipants } from "../../hooks/useDashParticipants";
import { TimeDataFrame } from "../TimeDataFrame/TimeDataFrame";

export const ParticipantRegistrationStatsCard = () => {
  const { eventId } = useParams();
  const { participantRegistrations, registrationsByDay } = useDashParticipants({
    eventId,
  });

  return (
    <TimeDataFrame
      title="Participant Registrations"
      totalTitle="Total Participants"
      total={participantRegistrations}
      series={registrationsByDay?.map((d) => ({ date: d.date, count: d.count }))}
      unitSingular="Participant"
      unitPlural="Participants"
    />
  );
};

