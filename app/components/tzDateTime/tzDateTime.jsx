/**
 *
 * Under the hood, when you pick a date, time and “tz” in the UI, we call buildIso to spit out a standard ISO-8601
 * string—but we stuff a little hack into the seconds field: instead of always “00”, we set SS to the (index + 1)
 * of your chosen abbreviation in our tz list. That way, even when two zones share the same offset (like EST and
 * CDT both at –05:00 in winter/summer), parseIso can look at SS first, recover the exact abbr you picked, and only
 * if that fails fall back to matching by numeric offset. Every time you change date, time or tzAbbr, a useEffect
 * fires to rebuild and push the new ISO string (with its embedded zone index), ensuring your original zone choice
 * survives ambiguous offsets.
 */

import React, { useState, useEffect, useRef } from "react";
import { Input, DropdownInput } from "tabler-react-2";
import { Row } from "../../util/Flex";
import timezones from "./tzs.json";

export const inferTzFromIso = (iso) => {
  const [Y, M, D] = iso.split("-").map(Number);
  const [h, m] = iso.split("T")[1].split(":").map(Number);
  const offH = timezones.find((t) => t.offset === h * 3_600 + m * 60)?.offset;
  return timezones.find((t) => t.offset === offH)?.abbr;
};

// build ISO-8601 with hack: seconds = index+1
export const buildIso = (Y, M, D, h, m, offH, tzAbbr) => {
  const pad = (n) => String(n).padStart(2, "0");
  const sign = offH >= 0 ? "+" : "-";
  const absOff = Math.abs(offH);
  const hrs = Math.floor(absOff);
  const mins = Math.round((absOff - hrs) * 60);
  const idx = timezones.findIndex((t) => t.abbr === tzAbbr);
  const sec = idx >= 0 ? idx + 1 : 0;
  return `${Y}-${pad(M)}-${pad(D)}T${pad(h)}:${pad(m)}:${pad(sec)}${sign}${pad(
    hrs
  )}:${pad(mins)}`;
};

const getOffsetHoursFromIso = (iso) => {
  const m = iso.match(/([+\-]\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, hStr, minStr] = m;
  const h = parseInt(hStr, 10);
  const min = parseInt(minStr, 10);
  return h >= 0 ? h + min / 60 : h - min / 60;
};

const truncate = (str, max = 50) =>
  str.length <= max ? str : str.slice(0, max) + "...";

const parseIso = (iso) => {
  if (!iso) return { date: "", time: "", tzAbbr: "" };
  const date = iso.slice(0, 10);
  const time = iso.slice(11, 16);
  const secMatch = iso.match(/T\d{2}:\d{2}:(\d{2})/);
  const sec = secMatch ? parseInt(secMatch[1], 10) : 0;
  let zone;
  if (sec > 0 && sec - 1 < timezones.length) {
    zone = timezones[sec - 1];
  } else {
    const offH = getOffsetHoursFromIso(iso);
    zone = timezones.find((t) => t.offset === offH);
  }
  return { date, time, tzAbbr: zone?.abbr || "" };
};

export const TzDateTime = ({
  value,
  onChange,
  label,
  requireNewTime = false,
  defaultTz, // the timezone.value you want as default
}) => {
  const didMountRef = useRef(false);

  const [date, setDate] = useState(() => (value ? parseIso(value).date : ""));
  const [time, setTime] = useState(() => (value ? parseIso(value).time : ""));
  const [tzAbbr, setTzAbbr] = useState(() => {
    if (value) {
      return parseIso(value).tzAbbr;
    }
    if (defaultTz) {
      const def = timezones.find((t) => t.value === defaultTz);
      return def?.abbr || "";
    }
    return "";
  });

  // sync incoming value → local state, or apply defaultTz when no value
  useEffect(() => {
    if (!value) {
      setDate("");
      setTime("");
      if (defaultTz) {
        const def = timezones.find((t) => t.value === defaultTz);
        setTzAbbr(def?.abbr || "");
      } else {
        setTzAbbr("");
      }
      return;
    }
    const { date: d, time: t, tzAbbr: z } = parseIso(value);
    if (d !== date) setDate(d);
    if (!requireNewTime && t !== time) setTime(t);
    if (z !== tzAbbr) setTzAbbr(z);
  }, [value, requireNewTime, defaultTz]);

  // emit ISO when all parts present (skip initial mount)
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (!date || !time || !tzAbbr) return;
    const [Y, M, D] = date.split("-").map(Number);
    const [h, m] = time.split(":").map(Number);
    const offH = timezones.find((t) => t.abbr === tzAbbr)?.offset ?? 0;
    const iso = buildIso(Y, M, D, h, m, offH, tzAbbr);
    if (iso !== value) onChange(iso);
  }, [date, time, tzAbbr]);

  return (
    <div className="mb-3">
      {label && <label className="form-label">{label}</label>}
      <Row gap={1}>
        <Input
          type="date"
          value={date}
          onChange={(d) => setDate(d || "")}
          prependedText="Date"
          noMargin
          style={{ flex: 1 }}
        />
        <Input
          type="time"
          value={time}
          onChange={(t) => setTime(t || "")}
          prependedText="Time"
          noMargin
        />
        <DropdownInput
          prompt="Select a tz"
          items={timezones.map((t) => ({
            ...t,
            id: t.abbr,
            label: t.abbr,
            dropdownText: truncate(`(${t.abbr}) ${t.text}`),
            searchIndex: `${t.utc.join(" ")} ${t.abbr}`,
          }))}
          value={tzAbbr}
          onChange={(item) =>
            setTzAbbr(typeof item === "string" ? item : item.id)
          }
        />
      </Row>
    </div>
  );
};

export const TzPicker = ({ value, onChange, ...props }) => {
  const [tzAbbr, setTzAbbr] = useState(value);

  useEffect(() => {
    if (value) {
      setTzAbbr(value);
    }
  }, [value]);

  useEffect(() => {
    onChange?.(tzAbbr);
  }, [tzAbbr]);

  return (
    <DropdownInput
      label="Timezone"
      prompt="Select a tz"
      items={timezones.map((t) => ({
        ...t,
        id: t.value,
        label: t.abbr,
        dropdownText: truncate(`(${t.abbr}) ${t.text}`),
        searchIndex: `${t.utc.join(" ")} ${t.abbr}`,
      }))}
      value={tzAbbr}
      onChange={(item) => setTzAbbr(item.value)}
      {...props}
    />
  );
};
