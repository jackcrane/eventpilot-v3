import React, { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";
import { svg } from "htl";
import moment from "moment";

export const TimeLineChart = ({
  data,
  height = 150,
  unitSingular = "Volunteer",
  unitPlural = "Volunteers",
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const resize = () => {
      if (!containerRef.current) return;

      const width = containerRef.current.offsetWidth;

      const plot = Plot.plot({
        width,
        height,
        x: {
          type: "utc",
          grid: true,
          tickFormat: (d) => moment(d).format("M/D"),
          ticks: data.length > 14 ? "week" : "day",
        },
        y: {
          nice: true,
          tickFormat: (d) => (Number.isInteger(d) ? d : ""),
          ticks:
            Math.min(...data.map((d) => d.qty)) ===
            Math.max(...data.map((d) => d.qty))
              ? 1
              : undefined,
        },
        marks: [
          () => svg`<defs>
        <linearGradient id="gradient" gradientTransform="rotate(90)">
          <stop offset="20%" stop-color="var(--tblr-primary)" stop-opacity="0.1" />
          <stop offset="70%" stop-color="var(--tblr-primary)" stop-opacity="0" />
        </linearGradient>
      </defs>`,
          Plot.areaY(data, { x: "date", y: "qty", fill: "url(#gradient)" }),
          Plot.line(data, {
            x: "date",
            y: "qty",
            stroke: "var(--tblr-primary)",
            strokeWidth: 2,
          }),
          Plot.ruleX(
            data,
            Plot.pointerX({
              x: "date",
              py: "qty",
              stroke: "var(--tblr-danger)",
            })
          ),
          Plot.dot(
            data,
            Plot.pointerX({
              x: "date",
              y: "qty",
              stroke: "var(--tblr-danger)",
            })
          ),
          Plot.text(
            data,
            Plot.pointerX({
              px: "date",
              py: "qty",
              dy: -16,
              frameAnchor: "top-left",
              fontVariant: "tabular-nums",
              text: (d) =>
                [
                  `Date ${moment(d.date).format("M/D/YY")}`,
                  `${d.qty?.toFixed(0) || 0} ${d.qty === 1 ? unitSingular : unitPlural}`,
                ].join("   "),
            })
          ),
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
  }, [data, height]);

  return <div ref={containerRef} style={{ width: "100%" }} />;
};
