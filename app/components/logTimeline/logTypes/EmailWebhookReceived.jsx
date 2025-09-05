import React from "react";
import moment from "moment";
import { DATETIME_FORMAT } from "../../../util/Constants";
import OffcanvasTrigger from "../../OffcanvasTrigger";
import { Typography } from "tabler-react-2";
import { EmailPreview } from "../../emailPreview/emailPreview";

// Shape matches the requested export style. Dynamic fields are functions.
export const EmailWebhookReceived = {
  title: "Email Received",
  description: (log) => (
    <div>
      <Typography.Text>
        This person sent an email to your event.
      </Typography.Text>
      <OffcanvasTrigger prompt="View linked email" size="sm">
        <EmailPreview emailId={log.inboundEmailId} />
      </OffcanvasTrigger>
    </div>
  ),
  time: (log) => moment(log.createdAt).format(DATETIME_FORMAT),
  icon: "mail",
  iconBgColor: "green",
};
