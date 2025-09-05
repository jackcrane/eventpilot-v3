import React from "react";
import moment from "moment";
import { DATETIME_FORMAT } from "../../../util/Constants";

export const CrmNoteCreated = {
  title: "Note Added",
  description: (log) => (
    <p className="mb-0">{log?.data?.text || "A note was added."}</p>
  ),
  time: (log) => moment(log.createdAt).format(DATETIME_FORMAT),
  icon: "notes",
  iconBgColor: "teal",
};

