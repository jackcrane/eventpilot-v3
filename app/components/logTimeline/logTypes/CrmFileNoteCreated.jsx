import React from "react";
import moment from "moment";
import { DATETIME_FORMAT } from "../../../util/Constants";
import { Typography, Button } from "tabler-react-2";

export const CrmFileNoteCreated = {
  title: "File Attached",
  description: (log) => {
    const name = log?.data?.originalname || "a file";
    const mime = log?.data?.mimetype ? ` (${log.data.mimetype})` : "";
    return (
      <div className="mb-0">
        <Typography.Text>
          Attached <u>{name}</u>
          {mime} to this contact.
        </Typography.Text>
        <Button size="sm" href={log.data.location}>
          Download linked file
        </Button>
      </div>
    );
  },
  time: (log) => moment(log.createdAt).format(DATETIME_FORMAT),
  icon: "paperclip",
  iconBgColor: "cyan",
};
