import { Typography, Input } from "tabler-react-2";
import { Page } from "../../../components/page/Page";

export const CreateEvent = () => {
  return (
    <Page title="Create Event">
      <Typography.H5 className={"mb-0 text-secondary"}>EVENT</Typography.H5>
      <Typography.H1>Create Event</Typography.H1>
      <Typography.Text>
        Creating an event is the first step to recruit, manage, and engage
        excellent volunteers for your event.
      </Typography.Text>

      <Input label="Event Name" placeholder="Event Name" />
    </Page>
  );
};
