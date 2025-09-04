import React from "react";
import moment from "moment";
import { DATETIME_FORMAT } from "../../../util/Constants";

// Shape matches the requested export style. Dynamic fields are functions.
export const EmailWebhookBounce = {
  title: "Email Bounced",
  description: (log) => (
    <p className="mb-0">
      {log?.data?.eventName ? (
        <>
          Event <b>{log.data.eventName}</b> was updated.
        </>
      ) : (
        <>An event was updated.</>
      )}
    </p>
  ),
  time: (log) => moment(log.createdAt).format(DATETIME_FORMAT),
  icon: "pencil",
  iconBgColor: "blue",
};
