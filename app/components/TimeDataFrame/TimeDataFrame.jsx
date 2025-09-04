import { Card, SegmentedControl, Button } from "tabler-react-2";
import { useEffect, useState } from "react";
import moment from "moment";
import { CalendarPlot } from "../plots/calendar";
import { TimeLineChart } from "../plots/timeline";
import { Col, Responsive } from "../../util/Flex";
import { DataBox } from "../dataBox/DataBox";
import { Icon } from "../../util/Icon";
import { Loading } from "../loading/Loading";
import { Empty } from "../empty/Empty";

/**
 * TimeDataFrame: A reusable card that shows a total count and
 * either a calendar heatmap or a timeline of counts-by-day.
 */
export const TimeDataFrame = ({
  title,
  totalTitle,
  total,
  trend = null,
  loading = false,
  loadingTitle = "Loading",
  loadingText = "We are gathering your data...",
  series = [], // [{ date: Date|string, count: number }]
  defaultDisplay = "calendar",
  defaultCalendarMetric = "count",
  defaultTimeframe = "6",
  startDate, // optional; if provided, not used as anchor (endDate is)
  endDate, // optional; used as anchor when provided
  unitSingular = "Item",
  unitPlural = "Items",
  // Optional: [{ date: Date|string, color: string }]
  HighlightCells = [],
  // Optional comparison inputs for timeline overlay
  compareSeries = [], // [{ date, count }]
  anchorStartDate, // current instance start Date
  compareStartDate, // previous instance start Date
  // Enable a calendar-only toggle to show change vs previous instance
  enableCalendarChangeToggle = false,
  // Fraction of the timeframe to move on prev/next; 0.3 = 30%
  navStepFraction = 0.3,
  // Empty state customization
  emptyTitle = "Nothing to show yet",
  emptyText = "There isn't any data in this timeframe.",
  // Change callbacks to persist preferences
  onChangeDisplayFormat,
  onChangeCalendarMetric,
  onChangeTimeframe,
}) => {
  const [displayFormat, setDisplayFormat] = useState({ id: defaultDisplay });
  const [calendarMetric, setCalendarMetric] = useState({ id: defaultCalendarMetric }); // "count" | "change"
  // Timeframe state (in months) and paging by timeframe-size
  const [timeframe, setTimeframe] = useState({ id: defaultTimeframe }); // "1", "3", "6"
  const [offset, setOffset] = useState(0); // 0 = current window, -1 = previous, +1 = next

  // Sync internal state with changing defaults (e.g., after async load)
  useEffect(() => {
    setDisplayFormat((prev) => (prev?.id === defaultDisplay ? prev : { id: defaultDisplay }));
  }, [defaultDisplay]);
  useEffect(() => {
    setCalendarMetric((prev) => (prev?.id === defaultCalendarMetric ? prev : { id: defaultCalendarMetric }));
  }, [defaultCalendarMetric]);
  useEffect(() => {
    setTimeframe((prev) => (prev?.id === defaultTimeframe ? prev : { id: defaultTimeframe }));
  }, [defaultTimeframe]);

  const months = Number(timeframe?.id || 6);
  // Prefer provided endDate as anchor; otherwise use now + 1 month (existing default behavior)
  const anchorEnd = endDate ? moment(endDate) : moment().add(1, "month");
  const viewEndDate = anchorEnd
    .clone()
    .add(offset * months, "months")
    .toDate();
  const viewStartDate = moment(viewEndDate).subtract(months, "months").toDate();

  // Clamp step to sane range [0.01, 1]
  const step = Math.max(0.01, Math.min(1, Number(navStepFraction ?? 0.3)));

  const calendarData = series?.map((d) => ({ date: d.date, value: d.count }));
  const timelineData = series?.map((d) => ({ date: d.date, qty: d.count }));
  const compareTimelineData = compareSeries?.map((d) => ({
    date: d.date,
    qty: d.count,
  }));
  const maxValue = Math.max(0, ...(series || []).map((d) => d?.count ?? 0));

  // Determine if comparison is usable for calendar change view
  const hasComparison =
    enableCalendarChangeToggle &&
    Array.isArray(compareSeries) &&
    compareSeries.length > 0 &&
    !!anchorStartDate &&
    !!compareStartDate;

  // Build per-day change series aligned by day-offset from instance start
  const changeCalendarData = (() => {
    if (!hasComparison) return [];
    const dayMs = 24 * 60 * 60 * 1000;
    const toIso = (d) => {
      const x = d instanceof Date ? d : new Date(d);
      return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(
        2,
        "0"
      )}-${String(x.getUTCDate()).padStart(2, "0")}`;
    };

    const currentMap = new Map(
      (series || []).map((d) => [toIso(new Date(d.date)), d.count ?? 0])
    );
    const anchor = new Date(anchorStartDate);
    const prevStart = new Date(compareStartDate);
    const prevMappedMap = new Map();
    for (const d of compareSeries || []) {
      if (!d?.date) continue;
      const dDate = new Date(d.date);
      const offsetDays = Math.floor((dDate - prevStart) / dayMs);
      const mapped = new Date(anchor.getTime() + offsetDays * dayMs);
      prevMappedMap.set(toIso(mapped), d.count ?? 0);
    }

    const unionDays = new Set([...currentMap.keys(), ...prevMappedMap.keys()]);
    const out = [];
    for (const iso of unionDays) {
      const cur = currentMap.get(iso) ?? 0;
      const prev = prevMappedMap.get(iso) ?? 0;
      out.push({ date: new Date(`${iso}T00:00:00Z`), value: cur - prev });
    }
    out.sort((a, b) => new Date(a.date) - new Date(b.date));
    return out;
  })();

  const maxAbsChange = Math.max(
    0,
    ...changeCalendarData.map((d) => Math.abs(d.value ?? 0))
  );

  const isEmpty = !loading && (!Array.isArray(series) || series.length === 0);

  return (
    <Card title={title}>
      {loading ? (
        <Loading title={loadingTitle} text={loadingText} gradient={false} />
      ) : isEmpty ? (
        <Empty title={emptyTitle} text={emptyText} gradient={false} />
      ) : (
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
          <DataBox title={totalTitle} value={total} trend={trend} breakpoint={1000} />
          <div>
            <label className="form-label">Display Format</label>
            <SegmentedControl
              value={displayFormat}
              onChange={(v) => {
                setDisplayFormat(v);
                onChangeDisplayFormat && onChangeDisplayFormat(v);
              }}
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
              <Button
                size="sm"
                outline
                onClick={() => setOffset((o) => o - step)}
              >
                <Icon i="chevron-left" />
              </Button>
              <SegmentedControl
                value={timeframe}
                onChange={(v) => {
                  setTimeframe(v);
                  setOffset(0);
                  onChangeTimeframe && onChangeTimeframe(v);
                }}
                items={[
                  { id: "1", label: "1 mo" },
                  { id: "3", label: "3 mo" },
                  { id: "6", label: "6 mo" },
                ]}
                size="sm"
              />
              <Button
                size="sm"
                outline
                onClick={() => setOffset((o) => o + step)}
              >
                <Icon i="chevron-right" />
              </Button>
            </div>

            {displayFormat?.id === "calendar" && hasComparison && (
              <SegmentedControl
                value={calendarMetric}
                onChange={(v) => {
                  setCalendarMetric(v);
                  onChangeCalendarMetric && onChangeCalendarMetric(v);
                }}
                items={[
                  { id: "count", label: "Count" },
                  { id: "change", label: "Change" },
                ]}
                size="sm"
              />
            )}

            {displayFormat?.id === "calendar" &&
              calendarMetric?.id === "count" && (
                <div
                  aria-label="Calendar reference"
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
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
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <div
                      title="No data"
                      style={{
                        width: 12,
                        height: 12,
                        background: "#f8f8f8",
                        border: "1px solid var(--tblr-border-color)",
                      }}
                    />
                    <span style={{ fontSize: 12 }}>No data</span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
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
            {displayFormat?.id === "calendar" &&
              calendarMetric?.id === "change" && (
                <div
                  aria-label="Calendar reference"
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span style={{ fontSize: 12 }}>-{maxAbsChange}</span>
                    <div
                      title={`Change scale: -${maxAbsChange} to +${maxAbsChange}`}
                      style={{
                        width: 72,
                        height: 12,
                        background:
                          "linear-gradient(to right, var(--tblr-danger), #c9c9c9, var(--tblr-success))",
                      }}
                    />
                    <span style={{ fontSize: 12 }}>{maxAbsChange}</span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <div
                      title="No data"
                      style={{
                        width: 12,
                        height: 12,
                        background: "#f8f8f8",
                        border: "1px solid var(--tblr-border-color)",
                      }}
                    />
                    <span style={{ fontSize: 12 }}>No data</span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
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
            {displayFormat?.id === "timeline" && (
              <div
                aria-label="Timeline reference"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <Col gap={0} align="flex-start">
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <div
                      title="Current instance"
                      style={{
                        width: 24,
                        height: 0,
                        borderTop: "2px solid var(--tblr-primary)",
                      }}
                    />
                    <span style={{ fontSize: 12 }}>Current</span>
                  </div>
                  {!!compareSeries?.length && (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <div
                        title="Previous instance"
                        style={{
                          width: 24,
                          height: 0,
                          borderTop: "1px dashed var(--tblr-secondary)",
                        }}
                      />
                      <span style={{ fontSize: 12 }}>Previous</span>
                    </div>
                  )}
                </Col>
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
                  data={
                    calendarMetric?.id === "change"
                      ? changeCalendarData
                      : calendarData
                  }
                  startDate={viewStartDate}
                  endDate={viewEndDate}
                  height={200}
                  highlightToday
                  todayStroke="var(--tblr-danger)"
                  todayStrokeWidth={2}
                  showCounts
                  mode={
                    calendarMetric?.id === "change" ? "diverging" : "sequential"
                  }
                  positiveColor="#2ecc71"
                  negativeColor="#e74c3c"
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
                  compareData={compareTimelineData}
                  anchorStartDate={anchorStartDate}
                  compareStartDate={compareStartDate}
                />
              </div>
            )}
          </div>
        </div>
      </Responsive>
      )}
    </Card>
  );
};
