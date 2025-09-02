import React, { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import * as d3 from "d3";

export const CalendarPlot = ({
  data = [], // [{ date: Date|string, value: number }]
  width = 720,
  startDate,
  endDate,
  colorScheme = "greens", // string (Plot scheme) or array of colors
}) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !startDate || !endDate) return;

    const start = toUtcDay(startDate);
    const end = toUtcDay(endDate);
    const [lo, hi] = start <= end ? [start, end] : [end, start];
    const sunday0 = d3.utcSunday.floor(lo);

    // Map incoming data by UTC day (YYYY-MM-DD)
    const byDay = new Map();
    for (const { date, value } of data) byDay.set(isoDay(date), value ?? 0);

    // Build one cell per day in range
    const cells = [];
    for (let d = lo; d <= hi; d = d3.utcDay.offset(d, 1)) {
      const y = d.getUTCDay(); // 0..6
      const x = d3.utcWeek.count(sunday0, d); // week column index
      cells.push({
        date: d,
        value: byDay.get(isoDay(d)),
        x1: x - 0.5,
        x2: x + 0.5,
        y1: y - 0.5,
        y2: y + 0.5,
        x,
        y,
      });
    }

    const max = d3.max(cells, (d) => d.value ?? 0) ?? 0;
    const weeks =
      1 + d3.utcWeek.count(d3.utcSunday.floor(lo), d3.utcSunday.floor(hi));

    // Weekday labels (Mon..Sun), order 1..6,0
    const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];
    const weekdayLabels = weekdayOrder.map((dow) => ({
      y: dow,
      label: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow],
    }));

    // Month spans + centered labels
    const monthStarts = [];
    for (
      let m = d3.utcMonth.floor(lo);
      m <= d3.utcMonth.floor(hi);
      m = d3.utcMonth.offset(m, 1)
    ) {
      monthStarts.push(new Date(m));
    }
    const rawBoundaries = monthStarts
      .map((m) => ({
        x: d3.utcWeek.count(sunday0, m),
        label: d3.utcFormat("%b")(m),
      }))
      .filter((b) => b.x >= 0 && b.x <= weeks - 1);

    const monthRanges = rawBoundaries.map((b, i) => {
      const x1 = b.x - 0.5;
      const x2 =
        (i + 1 < rawBoundaries.length ? rawBoundaries[i + 1].x : weeks) - 0.5;
      const mid = (x1 + x2) / 2;
      return { x1, x2, mid, label: b.label, i };
    });

    const evenMonthBands = monthRanges.filter((r) => r.i % 2 === 0);

    const plot = Plot.plot({
      width,
      height: Math.max(7 * Math.floor(width / Math.max(weeks, 1)), 70),
      marginTop: 26, // extra room for month labels on top
      marginLeft: 36, // room for weekday labels
      marginRight: 2,
      marginBottom: 2,
      padding: 0,
      axis: null,
      x: { type: "linear", domain: [-0.6, weeks - 0.4] },
      y: { type: "linear", domain: [-0.5, 6.5] }, // -0.5 bottom, 6.5 top
      color: {
        type: "linear",
        domain: [0, Math.max(1, max)],
        clamp: true,
        unknown: "#e5e7eb",
        ...(Array.isArray(colorScheme)
          ? { range: colorScheme }
          : { scheme: colorScheme }),
      },
      marks: [
        // Alternating month bands (constant fill, not on color scale)
        Plot.rect(evenMonthBands, {
          x1: "x1",
          x2: "x2",
          y1: -0.5,
          y2: 6.5,
          fill: "#f9fafb",
        }),

        // Month labels — centered at top
        Plot.text(monthRanges, {
          x: (d) => d.mid,
          y: 6.5, // top edge
          dy: -8, // nudge above the grid
          text: (d) => d.label,
          textAnchor: "middle",
          fontSize: 10,
        }),

        // Weekday labels (left)
        Plot.text(weekdayLabels, {
          x: -0.6,
          y: (d) => d.y,
          text: (d) => d.label,
          textAnchor: "end",
          fontSize: 10,
          dy: 3,
        }),

        // Heatmap cells
        Plot.rect(cells, {
          x1: "x1",
          x2: "x2",
          y1: "y1",
          y2: "y2",
          fill: "value",
          inset: 0.5,
          title: (d) =>
            `${d3.utcFormat("%a, %b %-d, %Y")(d.date)}${
              d.value != null ? ` — ${d.value}` : ""
            }`,
        }),
      ],
    });

    ref.current.innerHTML = "";
    ref.current.append(plot);
    return () => plot.remove();
  }, [data, width, startDate, endDate, colorScheme]);

  return <div ref={ref} />;
};

// ---- helpers (internal) ----
const toUtcDay = (input) => {
  const d = input instanceof Date ? input : new Date(input);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
};

const isoDay = (input) => {
  const d = input instanceof Date ? input : new Date(input);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
