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

    // Map incoming data by UTC day (YYYY-MM-DD)
    const byDay = new Map();
    for (const { date, value } of data) byDay.set(isoDay(date), value ?? 0);

    // Build one cell per day in range
    const cells = [];
    for (let d = lo; d <= hi; d = d3.utcDay.offset(d, 1)) {
      cells.push({ date: d, value: byDay.get(isoDay(d)) });
    }

    const max = d3.max(cells, (d) => d.value ?? 0) ?? 0;

    // Layout: columns = distinct weeks in range (inclusive)
    const weeks =
      1 + d3.utcWeek.count(d3.utcSunday.floor(lo), d3.utcSunday.floor(hi));
    const cellSize = Math.max(10, Math.floor(width / weeks));
    const height = cellSize * 7;

    const plot = Plot.plot({
      width,
      height,
      margin: 0,
      padding: 0,
      axis: null,
      x: { axis: null },
      y: { axis: null },
      color: {
        type: "linear",
        domain: [0, Math.max(1, max)],
        clamp: true,
        unknown: "#e5e7eb", // light gray for no data
        ...(Array.isArray(colorScheme)
          ? { range: colorScheme }
          : { scheme: colorScheme }),
      },
      marks: [
        Plot.cell(cells, {
          x: (d) => d3.utcWeek.count(d3.utcSunday.floor(lo), d.date),
          y: (d) => d.date.getUTCDay(), // 0..6 (Sun..Sat)
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
