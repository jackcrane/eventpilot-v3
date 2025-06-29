import moment from "moment";
import React from "react";
import { Dg } from "../formResponseRUD/FormResponseRUD";
import {
  capitalizeFirstLetter,
  screamingSnakeToSentence,
} from "./crmPersonCRUD";

// Component: SystemInfo

export const SystemInfo = ({ crmPerson = {} }) => (
  <div className="datagrid">
    <Dg
      title="Created At"
      description="The date and time this record was created. Set by the system."
      content={`${moment(crmPerson.createdAt).format(
        "M/DD/YYYY hh:mm a"
      )} (${moment(crmPerson.createdAt).fromNow()})`}
    />
    <Dg
      title="Updated At"
      description="The date and time this record was last updated. Set by the system anytime the record is updated."
      content={`${moment(crmPerson.updatedAt).format(
        "M/DD/YYYY hh:mm a"
      )} (${moment(crmPerson.updatedAt).fromNow()})`}
    />
    <Dg
      title="Source"
      description="How this record was created."
      content={capitalizeFirstLetter(
        screamingSnakeToSentence(crmPerson.source)
      )}
    />
  </div>
);
