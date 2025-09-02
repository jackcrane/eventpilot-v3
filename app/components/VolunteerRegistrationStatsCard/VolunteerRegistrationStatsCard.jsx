import { useParams } from "react-router-dom";
import { useDashVolunteers } from "../../hooks/useDashVolunteers";
import { TimeDataFrame } from "../TimeDataFrame/TimeDataFrame";

export const VolunteerRegistrationStatsCard = () => {
  const { eventId } = useParams();
  const { volunteerRegistrations, registrationsByDay } = useDashVolunteers({
    eventId,
  });

  return (
    <TimeDataFrame
      title="Volunteer Registrations"
      totalTitle="Total Volunteers"
      total={volunteerRegistrations}
      series={registrationsByDay?.map((d) => ({ date: d.date, count: d.count }))}
      unitSingular="Volunteer"
      unitPlural="Volunteers"
    />
  );
};
