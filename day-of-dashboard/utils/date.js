import moment from "moment-timezone";

import timezones from "../constants/tzs.json";
import { DATE_FORMAT, DATETIME_FORMAT } from "../constants/format";

const DEFAULT_TZ = "UTC";

const toLower = (value) =>
  typeof value === "string" ? value.toLowerCase() : "";

export const resolveTimeZone = (value) => {
  if (!value) return DEFAULT_TZ;
  const trimmed = `${value}`.trim();
  if (!trimmed.length) return DEFAULT_TZ;

  if (moment.tz.zone(trimmed)) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();

  const matchByValue = timezones.find((tz) => toLower(tz.value) === lower);
  if (matchByValue?.utc?.length) {
    return matchByValue.utc[0];
  }

  const matchByAbbr = timezones.find((tz) => toLower(tz.abbr) === lower);
  if (matchByAbbr?.utc?.length) {
    return matchByAbbr.utc[0];
  }

  const matchByText = timezones.find((tz) => toLower(tz.text).includes(lower));
  if (matchByText?.utc?.length) {
    return matchByText.utc[0];
  }

  return DEFAULT_TZ;
};

export const formatDateTime = (value, timeZone) => {
  if (!value) return "—";
  const targetTz = resolveTimeZone(timeZone);
  const instance = moment(value);
  if (!instance.isValid()) return "—";
  return instance.tz(targetTz).format(DATETIME_FORMAT);
};

export const formatDateTimeWithoutTimeZone = (value) => {
  if (!value) return "—";
  const instance = moment(value);
  if (!instance.isValid()) return "—";
  return instance.format(DATETIME_FORMAT);
};

export const formatDate = (value, timeZone) => {
  if (!value) return "—";
  const targetTz = resolveTimeZone(timeZone);
  const instance = moment(value);
  if (!instance.isValid()) return "—";
  return instance.tz(targetTz).format(DATE_FORMAT);
};

export const formatShiftRange = ({
  startTime,
  endTime,
  startTimeTz,
  endTimeTz,
}) => {
  if (!startTime || !endTime) return "—";
  const labelTz = startTimeTz || endTimeTz;
  const resolvedTz = resolveTimeZone(labelTz);

  const start = moment(startTime);
  const end = moment(endTime);
  if (!start.isValid() || !end.isValid()) return "—";

  const startLabel = start.tz(resolvedTz).format(DATETIME_FORMAT);
  const sameDay = start.tz(resolvedTz).isSame(end.tz(resolvedTz), "day");
  const endLabel = sameDay
    ? end.tz(resolvedTz).format("h:mm A")
    : end.tz(resolvedTz).format(DATETIME_FORMAT);
  const tzAbbr = start.tz(resolvedTz).format("z");

  const timezoneSuffix = tzAbbr ? ` (${tzAbbr})` : "";
  return `${startLabel} - ${endLabel}${timezoneSuffix}`;
};

export const formatShiftTime = (value, timeZone) =>
  formatDateTime(value, timeZone);
