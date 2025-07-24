import React, { useState, useEffect } from "react";
import moment from "moment-timezone";
import { Input, DropdownInput } from "tabler-react-2";
import { Row } from "../../util/Flex";
import timezones from "./tzs.json";
import classNames from "classnames";

export const formatDate = (date, tzValue, format = "MMM DD, h:mm a") => {
  if (!date || !tzValue) return "";

  const zone = timezones.find((t) => t.value === tzValue)?.utc[0];
  if (!zone) return "";

  const m = moment.tz(date, zone);
  return m.format(format);
};

export const parseIso = (iso, tzValue) => {
  if (!iso || !tzValue) return ["", ""];

  const zone = timezones.find((t) => t.value === tzValue)?.utc[0];
  if (!zone) return ["", ""];

  const m = moment.tz(iso, zone);
  return [m.format("YYYY-MM-DD"), m.format("HH:mm")];
};

export const buildIsoFromParts = (date, time, tzValue) => {
  const zone = timezones.find((t) => t.value === tzValue)?.utc[0];
  let m = moment.tz(date + " " + time, "YYYY-MM-DD HH:mm", zone);
  return m.toISOString();
};

window.buildIsoFromParts = buildIsoFromParts;
window.parseIso = parseIso;

export const TzDateTime = ({
  value, // ISO string in
  tz, // initial tz.value
  onChange, // ([isoString, tzValue]) => void
  label,
  afterLabel,
  required = false,
  minDate,
  minTime,
  className,
  defaultDate,
  defaultTime,
  dateTimeValid = true,
  tzValid = true,
}) => {
  const [dateState, setDateState] = useState(() => {
    if (value) return parseIso(value, tz)[0];
    return defaultDate;
  });
  const [timeState, setTimeState] = useState(() => {
    if (value) return parseIso(value, tz)[1];
    return defaultTime;
  });
  const [tzState, setTzState] = useState(tz);

  useEffect(() => {
    if (dateState && timeState && tzState) {
      const iso = buildIsoFromParts(dateState, timeState, tzState);
      onChange([iso, tzState]);
    }
  }, [dateState, timeState, tzState]);

  useEffect(() => {
    if (value) {
      const current = buildIsoFromParts(dateState, timeState, tzState);
      if (current !== value) {
        const [d, t] = parseIso(value, tz);
        setDateState(d);
        setTimeState(t);
      }
    }
    if (tz) {
      setTzState(tz);
    }
  }, [value, tz]);

  return (
    <div className={classNames("mb-3", className)}>
      {label && (
        <Row gap={1} align="flex-start">
          <label className={`form-label ${required ? "required" : ""}`}>
            {label}
          </label>
          {afterLabel}
        </Row>
      )}
      <Row gap={1}>
        <Input
          type="date"
          value={dateState}
          inputProps={{ min: minDate }}
          onChange={(e) => setDateState(e)}
          prependedText="Date"
          noMargin
          style={{ flex: 1 }}
          invalid={!dateTimeValid}
        />
        <Input
          type="time"
          value={timeState}
          inputProps={{ min: minTime }}
          onChange={(e) => setTimeState(e)}
          prependedText="Time"
          noMargin
          invalid={!dateTimeValid}
        />
        <DropdownInput
          prompt="Select a tz"
          items={timezones.map((t) => ({
            id: t.value,
            value: t.value,
            label: t.abbr,
            dropdownText: truncate(`(${t.abbr}) ${t.text}`),
            searchIndex: `${t.utc.join(" ")} ${t.abbr}`,
          }))}
          value={tzState}
          onChange={(item) => {
            const newTz =
              typeof item === "string" ? item : item.value ?? item.id;
            setTzState(newTz);
          }}
          noMargin
          invalid={!tzValid}
        />
      </Row>
    </div>
  );
};

const truncate = (str, max = 50) => {
  if (str.length > max) {
    return str.slice(0, max - 1) + "…";
  }
  return str;
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

  // Remove duplicate timezones by abbr
  const uniqueTz = timezones.filter(
    (t, i, a) => a.findIndex((t2) => t2.abbr === t.abbr) === i
  );

  return (
    <DropdownInput
      label="Timezone"
      prompt="Select a tz"
      items={uniqueTz.map((t) => ({
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
