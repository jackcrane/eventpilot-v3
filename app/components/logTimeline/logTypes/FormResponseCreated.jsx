import React from "react";
import moment from "moment";
import { DATETIME_FORMAT } from "../../../util/Constants";
import OffcanvasTrigger from "../../OffcanvasTrigger";
import { Typography } from "tabler-react-2";
import { FormResponseRUD } from "../../formResponseRUD/FormResponseRUD";

// Shape matches the requested export style. Dynamic fields are functions.
export const FormResponseCreated = {
  title: "Volunteer Form Submitted",
  description: (log) => (
    <div>
      <Typography.Text>A volunteer form was submitted.</Typography.Text>
      <OffcanvasTrigger prompt="View form" size="sm">
        <FormResponseRUD id={log.formResponseId} />
      </OffcanvasTrigger>
    </div>
  ),
  time: (log) => moment(log.createdAt).format(DATETIME_FORMAT),
  icon: "pencil",
  iconBgColor: "blue",
};
