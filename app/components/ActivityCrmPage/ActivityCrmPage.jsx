import { Typography } from "tabler-react-2";
import LogViewer from "../logTimeline/LogViewer";
import { useCrmPerson } from "../../hooks/useCrmPerson";

export const ActivityCrmPage = ({ crmPerson }) => {
  return (
    <div className="mt-1">
      <Typography.H2>Activity</Typography.H2>
      <Typography.Text>
        This page contains the activity logs for this person. The content of
        this page is immutable.
      </Typography.Text>
      <LogViewer logs={crmPerson.logs} dense />
    </div>
  );
};
