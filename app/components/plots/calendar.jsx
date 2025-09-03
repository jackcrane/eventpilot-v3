import React, { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import * as d3 from "d3";

export const CalendarPlot = ({
  data = [], // [{ date: Date|string, value: number }]
  width = 720,
  startDate,
  endDate,
  colorScheme = "greens", // string (Plot scheme) or array of colors
  emptyColor = "#f8f8f8", // color for days without data
  highlightToday = false, // draw a stroke around today's cell
  todayStroke = "#111", // stroke color for today
  todayStrokeWidth = 1.5, // stroke width for today
  showCounts = false, // show count text if > 0
  showDates = false, // show the date number in each cell
  highlightCells = [], // [{ date: Date|string, color: string }]
  height, // optional fixed plot height to avoid growing with width
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

    // Map of highlighted days -> color
    const highlightByDay = new Map();
    for (const { date, color } of highlightCells ?? []) {
      if (date && color) highlightByDay.set(isoDay(date), color);
    }

    // Build one cell per day in range
    const cells = [];
    for (let d = lo; d <= hi; d = d3.utcDay.offset(d, 1)) {
      const y = d.getUTCDay(); // 0..6 (Sun..Sat)
      const x = d3.utcWeek.count(sunday0, d); // week column index
      cells.push({
        date: d, // midnight UTC
        value: byDay.get(isoDay(d)),
        x1: x - 0.5,
        x2: x + 0.5,
        y1: y - 0.5,
        y2: y + 0.5,
        x,
        y,
        highlightColor: highlightByDay.get(isoDay(d)),
      });
    }

    const max = d3.max(cells, (d) => d.value ?? 0) ?? 0;
    const weeks = 1 + d3.utcWeek.count(d3.utcSunday.floor(lo), d3.utcSunday.floor(hi));

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

    const todayIso = isoDay(new Date());
    const todayRect = highlightToday
      ? cells.filter((c) => isoDay(c.date) === todayIso)
      : [];

    const fmtDate = d3.utcFormat("%a, %b %-d, %Y");

    const highlightedCells = cells.filter((c) => !!c.highlightColor);

    const marginTop = 28;
    const marginLeft = 36;
    const marginRight = 2;
    const marginBottom = 2;

    // Choose plot dimensions to maintain square day cells.
    // If a height is provided, derive width from it. Otherwise, derive height from width.
    let plotHeight;
    let plotWidth;
    if (height != null) {
      const innerH = Math.max(1, height - (marginTop + marginBottom));
      const cell = Math.max(6, Math.floor(innerH / 7));
      plotHeight = cell * 7 + marginTop + marginBottom;
      const innerW = cell * Math.max(1, weeks);
      plotWidth = innerW + marginLeft + marginRight;
    } else {
      const innerW = Math.max(1, (width ?? 720) - (marginLeft + marginRight));
      const cell = Math.max(6, Math.floor(innerW / Math.max(1, weeks)));
      plotHeight = cell * 7 + marginTop + marginBottom;
      plotWidth = (width ?? 720);
    }

    const plot = Plot.plot({
      width: plotWidth,
      height: plotHeight,
      marginTop,
      marginLeft,
      marginRight,
      marginBottom,
      style: {
        overflow: "visible",
        fontFamily: "var(--tblr-body-font-family)",
      },
      padding: 0,
      axis: null,
      x: { type: "linear", domain: [-0.6, weeks - 0.4] },
      y: { type: "linear", domain: [-0.5, 6.5], reverse: true },
      color: {
        type: "linear",
        domain: [0, Math.max(1, max)],
        clamp: true,
        unknown: emptyColor,
        range: ["white", "#066fd1"], // custom gradient
      },
      marks: [
        // Month labels
        Plot.text(monthRanges, {
          x: (d) => d.mid,
          y: -0.5,
          dy: -8,
          text: (d) => d.label,
          textAnchor: "middle",
          fontSize: 10,
          fontFamily: "var(--tblr-body-font-family)",
        }),

        // Weekday labels
        Plot.text(weekdayLabels, {
          x: -0.6,
          y: (d) => d.y,
          text: (d) => d.label,
          textAnchor: "end",
          fontSize: 10,
          dy: 3,
          fontFamily: "var(--tblr-body-font-family)",
        }),

        // Heatmap cells (all)
        Plot.rect(cells, {
          x1: "x1",
          x2: "x2",
          y1: "y1",
          y2: "y2",
          fill: "value",
          inset: 0.75,
          title: (d) => `${fmtDate(d.date)} — ${d.value ?? 0}`,
          tip: { anchor: "top", pointer: "move" },
        }),

        // Highlighted cells (override background color) — visual-only layer
        ...(highlightedCells.length
          ? [
              Plot.rect(highlightedCells, {
                x1: "x1",
                x2: "x2",
                y1: "y1",
                y2: "y2",
                fill: (d) => d.highlightColor,
                inset: 0.75,
                pointerEvents: "none",
                ariaHidden: true,
              }),
            ]
          : []),

        // Counts inside cells (optional)
        ...(showCounts
          ? [
              Plot.text(
                cells.filter((d) => (d.value ?? 0) > 0),
                {
                  x: (d) => d.x,
                  y: (d) => d.y,
                  text: (d) => `${d.value}`,
                  fill: "#000",
                  textAnchor: "middle",
                  dy: 0,
                  fontSize: 12,
                  fontFamily: "var(--tblr-body-font-family)",
                }
              ),
            ]
          : []),

        // Date numbers (optional) — FIX: use UTC day-of-month to avoid timezone drift
        ...(showDates
          ? [
              Plot.text(cells, {
                x: (d) => d.x,
                y: (d) => d.y,
                text: (d) => d.date.getUTCDate(), // <-- was getDate()
                fill: "#000",
                textAnchor: "middle",
                dy: -5,
                dx: -5,
                fontSize: 8,
                fontFamily: "var(--tblr-body-font-family)",
                opacity: 0.3,
              }),
            ]
          : []),

        // Today stroke overlay
        ...(highlightToday && todayRect.length
          ? [
              Plot.rect(todayRect, {
                x1: "x1",
                x2: "x2",
                y1: "y1",
                y2: "y2",
                fill: "none",
                stroke: todayStroke,
                strokeWidth: todayStrokeWidth,
                pointerEvents: "none",
                ariaHidden: true,
              }),
            ]
          : []),
      ],
    });

    ref.current.innerHTML = "";
    ref.current.append(plot);
    return () => plot.remove();
  }, [
    data,
    width,
    startDate,
    endDate,
    colorScheme,
    emptyColor,
    highlightToday,
    todayStroke,
    todayStrokeWidth,
    showCounts,
    showDates, // ensure toggling re-renders
    highlightCells,
    height,
  ]);

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
