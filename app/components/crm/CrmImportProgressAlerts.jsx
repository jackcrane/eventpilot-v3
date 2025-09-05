import React from "react";
import { Alert, Spinner, Typography } from "tabler-react-2";
import { Row } from "../../util/Flex";
import moment from "moment";

export const CrmImportProgressAlerts = ({ imports = [] }) => {
  if (!imports || imports.length === 0) return null;
  return (
    <>
      {imports.map((i) => (
        <Alert
          variant="info"
          title={
            <Row gap={1} align="center">
              <Spinner size="sm" />
              <Typography.H3 className="ml-2 mb-0">Importing</Typography.H3>
            </Row>
          }
          key={i.createdAt}
        >
          An import is currently running. It started {moment(i.createdAt).fromNow()} and is {Math.round((i.completed / i.total) * 100)}% complete.
        </Alert>
      ))}
    </>
  );
};

