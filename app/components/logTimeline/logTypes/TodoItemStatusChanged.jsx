import React from "react";
import moment from "moment";
import { DATETIME_FORMAT } from "../../../util/Constants";

const TITLE_MAP = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const humanizeStatus = (s) => TITLE_MAP[s] || s || "";

export const TodoItemStatusChanged = {
  title: "Status changed",
  description: (log) => {
    const from = log?.data?.from || "";
    const to = log?.data?.to || "";
    return (
      <p className="mb-0">
        {humanizeStatus(from)} → {humanizeStatus(to)}
      </p>
    );
  },
  time: (log) => moment(log.createdAt).format(DATETIME_FORMAT),
  icon: "arrows-exchange",
  iconBgColor: "yellow",
};

