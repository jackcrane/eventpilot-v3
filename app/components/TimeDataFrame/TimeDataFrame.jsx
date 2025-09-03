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
  // Optional: [{ date: Date|string, color: string }]
  HighlightCells = [],
}) => {
  const [displayFormat, setDisplayFormat] = useState({ id: defaultDisplay });

  const calendarData = series?.map((d) => ({ date: d.date, value: d.count }));
  const timelineData = series?.map((d) => ({ date: d.date, qty: d.count }));
  const maxValue = Math.max(0, ...(series || []).map((d) => d?.count ?? 0));

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
          <div
            style={{ display: "flex", flexDirection: "column", width: "100%" }}
          >
            {/* Legend / reference aligned top-right, no borders/background */}
            <div
              aria-label="Calendar reference"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 16,
                marginBottom: 8,
                width: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12 }}>0</span>
                <div
                  title={`Scale: 0 to ${maxValue}`}
                  style={{
                    width: 72,
                    height: 12,
                    background: "linear-gradient(to right, white, #066fd1)",
                  }}
                />
                <span style={{ fontSize: 12 }}>{maxValue}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  title="Event dates"
                  style={{
                    width: 12,
                    height: 12,
                    background: "var(--tblr-success)",
                  }}
                />
                <span style={{ fontSize: 12 }}>Event dates</span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                width: "100%",
              }}
            >
              <CalendarPlot
                data={calendarData}
                startDate={startDate}
                endDate={endDate}
                highlightToday
                todayStroke="var(--tblr-danger)"
                todayStrokeWidth={2}
                showCounts
                // Pass through to calendar as lower-cased prop
                highlightCells={HighlightCells}
              />
            </div>
          </div>
        ) : (
          <TimeLineChart
            data={timelineData}
            height={150}
            unitSingular={unitSingular}
            unitPlural={unitPlural}
            startDate={startDate}
            endDate={endDate}
          />
        )}
      </Responsive>
    </Card>
  );
};
