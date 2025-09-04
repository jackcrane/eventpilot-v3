import React from "react";
import moment from "moment";
import { DATETIME_FORMAT } from "../../../util/Constants";
import OffcanvasTrigger from "../../OffcanvasTrigger";
import { Typography } from "tabler-react-2";
import { EmailPreview } from "../../emailPreview/emailPreview";

// Shape matches the requested export style. Dynamic fields are functions.
export const EmailWebhookBounce = {
  title: "Email Bounced",
  description: (log) => (
    <div>
      <Typography.Text>
        The email sent to <u>{JSON.parse(log.data).Email}</u> with subject{" "}
        <u>{JSON.parse(log.data).Subject}</u> was experienced a{" "}
        <u>{JSON.parse(log.data).Name}</u> at{" "}
        <u>{moment(JSON.parse(log.data).bouncedAt).format(DATETIME_FORMAT)}</u>.
        The error was <u>{JSON.parse(log.data).Details}</u>.
      </Typography.Text>
      <OffcanvasTrigger prompt="View linked email" size="sm">
        <EmailPreview emailId={log.emailId} />
      </OffcanvasTrigger>
    </div>
  ),
  time: (log) => moment(log.createdAt).format(DATETIME_FORMAT),
  icon: "pencil",
  iconBgColor: "blue",
};
