import { useParams } from "react-router-dom";
import { useDashVolunteers } from "../../hooks/useDashVolunteers";
import { Card, SegmentedControl } from "tabler-react-2";
import { CalendarPlot } from "../plots/calendar";
import moment from "moment";
import { Col, Responsive, Row } from "../../util/Flex";
import { DataBox } from "../dataBox/DataBox";
import { TimeLineChart } from "../plots/timeline";
import { useState } from "react";

export const VolunteerRegistrationStatsCard = () => {
  const { eventId } = useParams();
  const { loading, volunteerRegistrations, registrationsByDay } =
    useDashVolunteers({ eventId });
  const [displayFormat, setDisplayFormat] = useState({ id: "calendar" });

  return (
    <Card title="Volunteer Registrations">
      {/* <h2>Volunteer Registrations</h2> */}
      <Responsive
        align="center"
        colAlign="flex-start"
        justify="space-between"
        gap={2}
        breakpoint={1000}
      >
        <Responsive
          align="flex-start"
          style={{ minWidth: 170 }}
          breakpoint={1000}
          defaultDirection="column"
          colGap={2}
        >
          <DataBox
            title="Total Volunteers"
            value={volunteerRegistrations}
            breakpoint={1000}
          />
          <div>
            <label className="form-label">Display Format</label>
            <SegmentedControl
              value={displayFormat}
              onChange={setDisplayFormat}
              items={[
                { id: "calendar", label: "Calendar" },
                { id: "timeline", label: "Timeline" },
              ]}
            />
          </div>
        </Responsive>
        {displayFormat?.id === "calendar" ? (
          <CalendarPlot
            data={registrationsByDay?.map((d) => ({
              date: d.date,
              value: d.count,
            }))}
            startDate={moment().add(1, "month").toDate()}
            endDate={moment().subtract(5, "months").toDate()}
            highlightToday
            todayStroke="var(--tblr-danger)"
            todayStrokeWidth={2}
            showCounts
          />
        ) : (
          <TimeLineChart
            data={registrationsByDay?.map((d) => ({
              date: d.date,
              qty: d.count,
            }))}
            width={300}
            height={150}
          />
        )}
      </Responsive>
    </Card>
  );
};
