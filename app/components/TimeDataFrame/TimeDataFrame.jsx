import { Card, SegmentedControl } from "tabler-react-2";
import { useState } from "react";
import moment from "moment";
import { CalendarPlot } from "../plots/calendar";
import { TimeLineChart } from "../plots/timeline";
import { Responsive } from "../../util/Flex";
import { DataBox } from "../dataBox/DataBox";

/**
 * TimeDataFrame: A reusable card that shows a total count and
 * either a calendar heatmap or a timeline of counts-by-day.
 */
export const TimeDataFrame = ({
  title,
  totalTitle,
  total,
  series = [], // [{ date: Date|string, count: number }]
  defaultDisplay = "calendar",
  startDate = moment().add(1, "month").toDate(),
  endDate = moment().subtract(5, "months").toDate(),
  unitSingular = "Item",
  unitPlural = "Items",
}) => {
  const [displayFormat, setDisplayFormat] = useState({ id: defaultDisplay });

  const calendarData = series?.map((d) => ({ date: d.date, value: d.count }));
  const timelineData = series?.map((d) => ({ date: d.date, qty: d.count }));

  return (
    <Card title={title}>
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
          <DataBox title={totalTitle} value={total} breakpoint={1000} />
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
            data={calendarData}
            startDate={startDate}
            endDate={endDate}
            highlightToday
            todayStroke="var(--tblr-danger)"
            todayStrokeWidth={2}
            showCounts
          />
        ) : (
          <TimeLineChart
            data={timelineData}
            height={150}
            unitSingular={unitSingular}
            unitPlural={unitPlural}
          />
        )}
      </Responsive>
    </Card>
  );
};

