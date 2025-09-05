import React from "react";
import moment from "moment";
import { Timeline } from "tabler-react-2";
import { Icon } from "../../util/Icon";
import { DATETIME_FORMAT } from "../../util/Constants";
import * as logTypeDefs from "./logTypes";

const toPascalCase = (str = "") =>
  String(str)
    .toLowerCase()
    .split("_")
    .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : s))
    .join("");

const evaluateMaybeFn = (val, log) => (typeof val === "function" ? val(log) : val);

const coerceIcon = (icon) => {
  // Accept a string (tabler icon name), a React element, or a component fn
  if (!icon) return null;
  if (typeof icon === "string") return <Icon i={icon} size={18} />;
  if (typeof icon === "function") return icon({ size: 18 });
  return icon; // assume element
};

const buildEventFromDef = (def, log) => {
  // def can be a function (log) => config or an object with maybe-fn fields
  const base = typeof def === "function" ? def(log) : def || {};

  const title = evaluateMaybeFn(base.title, log) ?? String(log.type);
  const description = evaluateMaybeFn(base.description, log) ?? null;
  const time =
    evaluateMaybeFn(base.time, log) ?? moment(log.createdAt).format(DATETIME_FORMAT);
  const icon = coerceIcon(evaluateMaybeFn(base.icon, log));
  const iconBgColor = evaluateMaybeFn(base.iconBgColor, log) ?? undefined;

  return { title, description, time, icon, iconBgColor };
};

const defaultEvent = (log) => ({
  title: String(log.type || "Log"),
  description: null,
  time: moment(log.createdAt).format(DATETIME_FORMAT),
  icon: <Icon i="info-circle" size={18} />,
  iconBgColor: "gray",
});

export const LogViewer = ({ logs = [], dense = false }) => {
  const toEvent = (log) => {
    const key = toPascalCase(log?.type);
    const def = key ? logTypeDefs[key] : null;
    if (def) return buildEventFromDef(def, log);
    return defaultEvent(log);
  };

  return <Timeline dense={dense} events={logs.map(toEvent)} />;
};

export default LogViewer;

