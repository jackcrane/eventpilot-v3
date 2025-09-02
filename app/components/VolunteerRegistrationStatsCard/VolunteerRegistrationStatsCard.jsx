import { useParams } from "react-router-dom";
import { useDashVolunteers } from "../../hooks/useDashVolunteers";
import { Card } from "tabler-react-2";
import { CalendarPlot } from "../plots/calendar";
import moment from "moment";

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
        startDate={moment().add(1, "month").toDate()}
        endDate={moment().subtract(5, "months").toDate()}
        colorScheme="greens"
        highlightToday
        todayStroke="var(--tblr-danger)"
      />
    </Card>
  );
};
