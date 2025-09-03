import { Card, SegmentedControl, Button } from "tabler-react-2";
import { useState } from "react";
import moment from "moment";
import { CalendarPlot } from "../plots/calendar";
import { TimeLineChart } from "../plots/timeline";
import { Responsive } from "../../util/Flex";
import { DataBox } from "../dataBox/DataBox";
import { Icon } from "../../util/Icon";

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
  startDate, // optional; if provided, not used as anchor (endDate is)
  endDate, // optional; used as anchor when provided
  unitSingular = "Item",
  unitPlural = "Items",
  // Optional: [{ date: Date|string, color: string }]
  HighlightCells = [],
}) => {
  const [displayFormat, setDisplayFormat] = useState({ id: defaultDisplay });
  // Timeframe state (in months) and paging by timeframe-size
  const [timeframe, setTimeframe] = useState({ id: "6" }); // "1", "3", "6"
  const [offset, setOffset] = useState(0); // 0 = current window, -1 = previous, +1 = next

  const months = Number(timeframe?.id || 6);
  // Prefer provided endDate as anchor; otherwise use now + 1 month (existing default behavior)
  const anchorEnd = endDate ? moment(endDate) : moment().add(1, "month");
  const viewEndDate = anchorEnd
    .clone()
    .add(offset * months, "months")
    .toDate();
  const viewStartDate = moment(viewEndDate).subtract(months, "months").toDate();

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
              size="sm"
            />
          </div>
        </Responsive>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
          }}
        >
          {/* Controls row: buttons left, legend right */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              width: "100%",
              marginBottom: 8,
              gap: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Button size="sm" outline onClick={() => setOffset((o) => o - 1)}>
                <Icon i="chevron-left" />
              </Button>
              <SegmentedControl
                value={timeframe}
                onChange={(v) => {
                  setTimeframe(v);
                  setOffset(0);
                }}
                items={[
                  { id: "1", label: "1 mo" },
                  { id: "3", label: "3 mo" },
                  { id: "6", label: "6 mo" },
                ]}
                size="sm"
              />
              <Button size="sm" outline onClick={() => setOffset((o) => o + 1)}>
                <Icon i="chevron-right" />
              </Button>
            </div>

            {displayFormat?.id === "calendar" && (
              <div
                aria-label="Calendar reference"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 16,
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
            )}
          </div>

          {/* Graph area (fixed height to avoid clipping, right-aligned) */}
          <div
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "flex-end",
            }}
          >
            {displayFormat?.id === "calendar" ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  width: "100%",
                }}
              >
                <CalendarPlot
                  data={calendarData}
                  startDate={viewStartDate}
                  endDate={viewEndDate}
                  height={200}
                  highlightToday
                  todayStroke="var(--tblr-danger)"
                  todayStrokeWidth={2}
                  showCounts
                  // Pass through to calendar as lower-cased prop
                  highlightCells={HighlightCells}
                />
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  width: "100%",
                }}
              >
                <TimeLineChart
                  data={timelineData}
                  height={150}
                  unitSingular={unitSingular}
                  unitPlural={unitPlural}
                  startDate={viewStartDate}
                  endDate={viewEndDate}
                />
              </div>
            )}
          </div>
        </div>
      </Responsive>
    </Card>
  );
};
