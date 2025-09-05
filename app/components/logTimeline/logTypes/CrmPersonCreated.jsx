import React from "react";
import moment from "moment";
import { DATETIME_FORMAT } from "../../../util/Constants";
import { Typography } from "tabler-react-2";

export const CrmPersonCreated = {
  title: "CRM Person Created",
  description: (log) => {
    return (
      <div>
        <Typography.Text className="mb-0">
          A CRM person was created.
        </Typography.Text>
      </div>
    );
  },
  time: (log) => moment(log.createdAt).format(DATETIME_FORMAT),
  icon: "user",
  iconBgColor: "blue",
};
