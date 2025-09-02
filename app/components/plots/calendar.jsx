// CalendarPlot.jsx
import React, { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import * as d3 from "d3";

/**
 * CalendarPlot
 * Props:
 * - data: Array<{ date: Date|string, value: number }>
 * - width?: number
 * - height?: number
 * - startDate: Date|string  (first calendar day to show; typically a Sunday)
 * - endDate: Date|string    (last calendar day to show; typically a Saturday)
 * - colorScheme?: string | string[]  (any Plot color scheme name or array of colors)
 *
 * Notes:
 * - Dates may be Date objects or ISO strings; they are coerced to Date.
 * - Renders a year-by-year calendar heatmap (fy facets), including weekends.
 * - Uses UTC for week/day math to avoid DST artifacts.
 */
export const CalendarPlot = ({
  data,
  width = 1152,
  // height = 480,
  startDate,
  endDate,
  colorScheme = "blues",
}) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!startDate || !endDate) return;

    // Coerce dates
    const toDate = (x) => (x instanceof Date ? x : new Date(x));
    const S = toDate(startDate);
    const E = toDate(endDate);

    // Guard
    if (!(S instanceof Date) || isNaN(S) || !(E instanceof Date) || isNaN(E))
      return;

    // Normalize incoming data: {Date, Value}
    const rows = (data ?? []).map((d) => ({
      Date: toDate(d.date),
      Value: typeof d.value === "number" ? d.value : NaN,
    }));

    // Derive calendar domain bounds (week index & weekday)
    const calStart = d3.utcDay.floor(S);
    const calEnd = d3.utcDay.ceil(E);
    const years = d3.utcYear.range(
      d3.utcYear.floor(calStart),
      d3.utcYear.offset(d3.utcYear.ceil(calEnd), 0)
    );

    // Helper: calendar channels for Plot.*
    const calendar = (opt = {}) => ({
      x: opt.x ?? ((d) => d3.utcWeek.count(d3.utcYear(d.Date), d.Date)),
      y: opt.y ?? ((d) => d.Date.getUTCDay()),
      fy: opt.fy ?? ((d) => d.Date.getUTCFullYear()),
      ...opt,
    });

    // Month start dates within [calStart, calEnd)
    const monthStarts = d3.utcMonths(d3.utcMonth.floor(calStart), calEnd);
    // Day sequence (for day numbers overlay)
    const allDays = d3.utcDays(calStart, calEnd);

    // Precompute daily value map for fast lookup in pointer titles
    const key = (d) => d.toISOString().slice(0, 10);
    const dailyMap = new Map(
      rows.map((r) => [key(d3.utcDay.floor(r.Date)), r.Value])
    );

    // Compute color domain (ignore NaN)
    const vals = rows.map((r) => r.Value).filter((v) => Number.isFinite(v));
    const vmin = vals.length ? d3.min(vals) : 0;
    const vmax = vals.length ? d3.max(vals) : 1;

    // Size heuristics: each facet ~160px tall by default (7 rows + labels)
    const facetCount = years.length || 1;

    // Build plot
    const plot = Plot.plot({
      width,
      axis: null,
      padding: 0,
      x: {
        // 54 weeks covers all years incl. leap-week years; include weekends.
        domain: d3.range(54),
      },
      y: {
        axis: "left",
        domain: d3.range(7), // 0..6 (Sun..Sat)
        ticks: d3.range(7),
        tickSize: 0,
        tickFormat: Plot.formatWeekday(),
      },
      fy: {
        padding: 0.1,
        reverse: true,
      },
      color: {
        scheme: colorScheme,
        domain: [vmin, vmax],
        legend: true,
      },
      marks: [
        // Month labels placed in the Sunday row, at the first Sunday on/after each month start
        Plot.text(
          monthStarts.map((m) => d3.utcSunday.ceil(m)),
          calendar({
            text: (d) => d3.utcFormat("%b")(d), // Jan, Feb, ...
            frameAnchor: "left",
            dy: -8,
            fontWeight: 600,
            y: () => 0, // Sunday row
          })
        ),

        // Calendar cells (fill by Value); slice off the very first datum if you use diffs
        Plot.cell(
          rows,
          calendar({
            fill: "Value",
            title: (d) => {
              const day = d3.utcDay.floor(d.Date);
              const v = dailyMap.get(key(day));
              return `${d3.utcFormat("%a, %b %-d, %Y")(day)}\n${v ?? "—"}`;
            },
            inset: 0.5,
          })
        ),

        // Thin month separators (vertical)
        Plot.ruleX(
          monthStarts.map((m) => d3.utcSunday.ceil(m)),
          calendar({
            stroke: "#dedede",
            strokeWidth: 1,
          })
        ),

        // Day numbers (small, faint)
        Plot.text(
          allDays,
          calendar({
            text: (d) => d3.utcFormat("%-d")(d.Date),
            fillOpacity: 0.6,
            fontSize: 9,
          })
        ),

        // Pointer highlight + tooltip
        Plot.ruleX(
          allDays,
          Plot.pointerX(
            calendar({
              stroke: "#999",
              strokeOpacity: 0.6,
            })
          )
        ),
        Plot.text(
          allDays,
          Plot.pointerX(
            calendar({
              frameAnchor: "bottom-left",
              dx: 8,
              dy: -8,
              text: (d) => {
                const day = d3.utcDay.floor(d.Date);
                const v = dailyMap.get(key(day));
                return `${d3.utcFormat("%b %-d, %Y")(day)}   ${v ?? "—"}`;
              },
              fontVariant: "tabular-nums",
              fill: "#333",
              fillOpacity: 0.9,
              stroke: "white",
              strokeWidth: 3,
              paintOrder: "stroke",
            })
          )
        ),
      ],
    });

    const el = ref.current;
    el.innerHTML = "";
    el.appendChild(plot);

    return () => {
      try {
        plot.remove();
      } catch {
        /* noop */
      }
    };
  }, [data, width, startDate, endDate, colorScheme]);

  return <div ref={ref} />;
};
