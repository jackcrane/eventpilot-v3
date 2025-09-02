import { useParams } from "react-router-dom";
import { useDashVolunteers } from "../../hooks/useDashVolunteers";
import { Card } from "tabler-react-2";
import { CalendarPlot } from "../plots/calendar";

export const VolunteerRegistrationStatsCard = () => {
  const { eventId } = useParams();
  const { loading, volunteerRegistrations, registrationsByDay } =
    useDashVolunteers({ eventId });

  return (
    <Card title="Volunteer Registrations">
      {/* <h2>Volunteer Registrations</h2> */}
      <CalendarPlot
        data={registrationsByDay?.map((d) => ({
          date: d.date,
          value: d.count,
        }))}
        startDate={new Date()}
        endDate={new Date(new Date().getTime() - 365 * 24 * 60 * 60 * 1000)}
      />
    </Card>
  );
};
