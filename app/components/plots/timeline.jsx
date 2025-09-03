import React, { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import { svg } from "htl";
import moment from "moment";

export const TimeLineChart = ({
  data,
  height = 150,
  unitSingular = "Volunteer",
  unitPlural = "Volunteers",
  // Optional: force the visible x-domain (calendar-aligned)
  startDate,
  endDate,
  // Optional comparison series for historical overlay
  compareData, // [{ date, qty }]
  anchorStartDate, // Date of the current instance start (for mapping)
  compareStartDate, // Date of the previous instance start (for mapping)
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const resize = () => {
      if (!containerRef.current) return;

      const width = containerRef.current.offsetWidth;
      const safeData = Array.isArray(data) ? data : [];

      // Determine x-domain: prefer provided start/end dates; otherwise infer from data.
      const xLo = startDate
        ? new Date(startDate)
        : safeData[0]
        ? new Date(safeData[0].date)
        : undefined;
      const xHi = endDate
        ? new Date(endDate)
        : safeData[safeData.length - 1]
        ? new Date(safeData[safeData.length - 1].date)
        : undefined;
      let xDomain;
      if (xLo && xHi) {
        xDomain = xLo <= xHi ? [xLo, xHi] : [xHi, xLo];
      }

      // Compute y-domain hints and tick config safely when no data.
      const qtys = safeData.map((d) => d.qty ?? 0);
      const minQty = qtys.length ? Math.min(...qtys) : 0;
      const maxQty = qtys.length ? Math.max(...qtys) : 0;
      const yDomain = [0, Math.max(1, maxQty)];

      // Choose sensible x tick interval based on range length (days).
      const msPerDay = 24 * 60 * 60 * 1000;
      const daySpan = xDomain
        ? Math.max(1, Math.round((xDomain[1] - xDomain[0]) / msPerDay))
        : safeData.length;
      const xTicks = daySpan > 14 ? "week" : "day";

      // Restrict interactive dataset to the visible x-domain to avoid
      // tooltips for cropped data outside the plot area.
      const visibleData = xDomain
        ? safeData.filter((d) => {
            const t = new Date(d.date).getTime();
            return t >= xDomain[0].getTime() && t <= xDomain[1].getTime();
          })
        : safeData;

      // Build mapped comparison data aligned to the current instance by day-offset.
      const mappedCompare = (() => {
        if (
          !Array.isArray(compareData) ||
          !anchorStartDate ||
          !compareStartDate
        )
          return [];
        const anchor = new Date(anchorStartDate);
        const prevStart = new Date(compareStartDate);
        const dayMs = 24 * 60 * 60 * 1000;
        return compareData
          .filter((d) => d?.date)
          .map((d) => {
            const dDate = new Date(d.date);
            const offsetDays = Math.floor((dDate - prevStart) / dayMs);
            const mapped = new Date(anchor.getTime() + offsetDays * dayMs);
            return { date: mapped, qty: d.qty ?? 0 };
          })
          .sort((a, b) => a.date - b.date);
      })();

      const mappedCompareMap = new Map(
        (Array.isArray(mappedCompare) ? mappedCompare : []).map((p) => [
          new Date(p.date).getTime(),
          p.qty ?? 0,
        ])
      );

      const plot = Plot.plot({
        width,
        height,
        x: {
          type: "utc",
          grid: true,
          tickFormat: (d) => moment(d).format("M/D"),
          ticks: xTicks,
          ...(xDomain ? { domain: xDomain } : {}),
        },
        y: {
          nice: true,
          grid: true,
          domain: yDomain,
          tickFormat: (d) => (Number.isInteger(d) ? d : ""),
          ticks: minQty === maxQty ? 1 : undefined,
        },
        marks: [
          () => svg`<defs>
        <linearGradient id="gradient" gradientTransform="rotate(90)">
          <stop offset="20%" stop-color="var(--tblr-primary)" stop-opacity="0.1" />
          <stop offset="70%" stop-color="var(--tblr-primary)" stop-opacity="0" />
        </linearGradient>
      </defs>`,
          // Baseline/frame to improve axis visibility
          Plot.ruleY([0], { stroke: "var(--tblr-border-color)" }),
          Plot.frame({ stroke: "var(--tblr-border-color)" }),

          // Only render series and pointer interactions when data is present
          ...(safeData.length
            ? [
                Plot.areaY(safeData, {
                  x: "date",
                  y: "qty",
                  fill: "url(#gradient)",
                  clip: true,
                }),
                Plot.line(safeData, {
                  x: "date",
                  y: "qty",
                  stroke: "var(--tblr-primary)",
                  strokeWidth: 2,
                  clip: true,
                }),
                // Historical overlay (previous instance mapped to current axis)
                ...(mappedCompare.length
                  ? [
                      Plot.line(mappedCompare, {
                        x: "date",
                        y: "qty",
                        stroke: "var(--tblr-secondary)",
                        strokeWidth: 1,
                        strokeDasharray: "5,3",
                        clip: true,
                      }),
                    ]
                  : []),
                Plot.ruleX(
                  visibleData,
                  Plot.pointerX({
                    x: "date",
                    py: "qty",
                    stroke: "var(--tblr-danger)",
                    clip: true,
                  })
                ),
                Plot.dot(
                  visibleData,
                  Plot.pointerX({
                    x: "date",
                    y: "qty",
                    stroke: "var(--tblr-danger)",
                    clip: true,
                  })
                ),
                // HTML tooltip near cursor using Plot.tip
                Plot.tip(
                  visibleData,
                  Plot.pointerX({
                    x: "date",
                    y: "qty",
                    title: (d) => {
                      const t = new Date(d.date).getTime();
                      const prev = mappedCompareMap.get(t);
                      const parts = [
                        `Date ${moment(d.date).format("M/D/YY")}`,
                        `${(d.qty ?? 0).toFixed(0)} ${
                          d.qty === 1 ? unitSingular : unitPlural
                        }`,
                      ];
                      if (typeof prev === "number") {
                        parts.push(
                          `${prev.toFixed(0)} ${
                            prev === 1 ? unitSingular : unitPlural
                          } (previous)`
                        );
                      }
                      return parts.join("\n");
                    },
                  })
                ),
              ]
            : []),
        ],
      });

      const container = containerRef.current;
      container.innerHTML = "";
      container.appendChild(plot);
    };

    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [
    data,
    height,
    startDate,
    endDate,
    unitPlural,
    unitSingular,
    compareData,
    anchorStartDate,
    compareStartDate,
  ]);

  return <div ref={containerRef} style={{ width: "100%" }} />;
};
