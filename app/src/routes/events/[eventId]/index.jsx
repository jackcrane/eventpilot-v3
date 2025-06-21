import { useParams } from "react-router-dom";
import { Page } from "../../../../components/page/Page";
import { useEvent } from "../../../../hooks/useEvent";
import { Typography } from "tabler-react-2";
import { EventPage } from "../../../../components/eventPage/EventPage";

export const Event = () => {
  const { eventId } = useParams();
  const { event, loading, error, refetch } = useEvent({ eventId });

  if (loading)
    return (
      <Page title="Event">
        <Typography.Text>Loading...</Typography.Text>
      </Page>
    );

  return (
    <EventPage title="Event">
      {/* <Typography.H5 className={"mb-0 text-secondary"}>EVENT</Typography.H5>
      <Typography.H1>{event?.name}</Typography.H1> */}
    </EventPage>
  );
};
