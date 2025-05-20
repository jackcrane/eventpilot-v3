// Calendar.jsx
import React, { useState, useRef } from "react";
import PropTypes from "prop-types";
import styles from "./calendarView.module.css";
import classNames from "classnames";
import moment from "moment";
import { Icon } from "../../util/Icon";

export const Calendar = ({ start, end, rows, className }) => {
  // dimensions
  const SLOT_WIDTH_PX = 80;
  const MINUTE_WIDTH_PX = SLOT_WIDTH_PX / 30;
  const OFFSET_LEFT_PX = 120;

  // hover state
  const [hoverLeft, setHoverLeft] = useState(null);
  const [relativeX, setRelativeX] = useState(null);
  const [hoverTime, setHoverTime] = useState("");

  const calendarRef = useRef(null);

  // helpers
  const toMs = (x) => (x instanceof Date ? x.getTime() : new Date(x).getTime());
  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);
  const timelineStartMs = toMs(startDate);
  const timelineEndMs = toMs(endDate);

  const getTimeSlots = () => {
    const slots = [];
    const cur = new Date(startDate);
    while (cur <= endDate) {
      slots.push(new Date(cur));
      cur.setMinutes(cur.getMinutes() + 30);
    }
    return slots;
  };
  const timeSlots = getTimeSlots();

  const calcTimeAt = (contentX) => {
    const mins = (contentX - OFFSET_LEFT_PX) / MINUTE_WIDTH_PX;
    return new Date(startDate.getTime() + mins * 60000);
  };

  const handleMouseMove = (e) => {
    if (!calendarRef.current) return;
    const { left } = calendarRef.current.getBoundingClientRect();
    const relX = e.clientX - left;
    const scrollLeft = calendarRef.current.scrollLeft;
    const contentX = relX + scrollLeft;

    if (
      contentX < OFFSET_LEFT_PX ||
      contentX > OFFSET_LEFT_PX + timeSlots.length * SLOT_WIDTH_PX
    ) {
      setHoverLeft(null);
      setRelativeX(null);
      setHoverTime("");
      return;
    }

    const time = calcTimeAt(contentX);
    setHoverLeft(contentX);
    setRelativeX(relX);
    setHoverTime(moment(time).format("h:mm a"));
  };

  const handleMouseLeave = () => {
    setHoverLeft(null);
    setRelativeX(null);
    setHoverTime("");
  };

  const handleScroll = (e) => {
    if (relativeX == null) return;
    const scrollLeft = e.target.scrollLeft;
    const contentX = relativeX + scrollLeft;

    if (
      contentX < OFFSET_LEFT_PX ||
      contentX > OFFSET_LEFT_PX + timeSlots.length * SLOT_WIDTH_PX
    ) {
      setHoverLeft(null);
      setHoverTime("");
      return;
    }

    const time = calcTimeAt(contentX);
    setHoverLeft(contentX);
    setHoverTime(moment(time).format("h:mm a"));
  };

  return (
    <>
      <div
        ref={calendarRef}
        className={classNames(styles.calendar, "card", className)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onScroll={handleScroll}
      >
        {hoverLeft !== null && (
          <div className={styles.hoverLine} style={{ left: `${hoverLeft}px` }}>
            <div className={styles.hoverFooter}>{hoverTime}</div>
          </div>
        )}

        {/* Header */}
        <div className={styles.calendarHeader}>
          <div className={styles.calendarLabel} />
          {timeSlots.map((dt, i) => (
            <div key={i} className={styles.calendarSlot}>
              <Icon
                i="corner-left-down"
                style={{ marginLeft: -10, display: "inline" }}
              />
              {moment(dt).format("h:mm a")}
            </div>
          ))}
        </div>

        {/* Rows */}
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className={styles.calendarRow}
            onClick={() => row?.onClick?.(row)}
          >
            <div className={styles.calendarLabel}>
              <span className={styles.scrollingText}>{row.label}</span>
            </div>
            {timeSlots.map((_, i) => (
              <div key={i} className={styles.calendarCell} />
            ))}
            {Array.isArray(row.items) &&
              row.items.map((item, idx) => {
                const msStart = toMs(item.start);
                const msEnd = toMs(item.end);
                if (
                  isNaN(msStart) ||
                  isNaN(msEnd) ||
                  msEnd <= timelineStartMs ||
                  msStart >= timelineEndMs
                ) {
                  return null;
                }
                const effStart = Math.max(msStart, timelineStartMs);
                const effEnd = Math.min(msEnd, timelineEndMs);
                const offsetMins = (effStart - timelineStartMs) / 60000;
                const durationMins = (effEnd - effStart) / 60000;
                const leftPx =
                  offsetMins * MINUTE_WIDTH_PX + 2 + OFFSET_LEFT_PX;
                const widthPx = durationMins * MINUTE_WIDTH_PX - 4;

                return (
                  <div
                    key={idx}
                    className={styles.calendarItem}
                    data-color={item.color}
                    style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                  >
                    <span className={styles.calendarItemText}>
                      <Icon i="clock" /> {moment(item.start).format("h:mm")} -{" "}
                      {moment(item.end).format("h:mm")}
                      <div style={{ marginLeft: "10px", display: "inline" }} />
                      <Icon i="hash" />
                      {item.capacity === 0 ? (
                        <Icon i="infinity" />
                      ) : (
                        item.capacity
                      )}
                    </span>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </>
  );
};

Calendar.propTypes = {
  start: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string])
    .isRequired,
  end: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string])
    .isRequired,
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      items: PropTypes.arrayOf(
        PropTypes.shape({
          start: PropTypes.oneOfType([
            PropTypes.instanceOf(Date),
            PropTypes.string,
          ]).isRequired,
          end: PropTypes.oneOfType([
            PropTypes.instanceOf(Date),
            PropTypes.string,
          ]).isRequired,
        })
      ),
    })
  ).isRequired,
};
