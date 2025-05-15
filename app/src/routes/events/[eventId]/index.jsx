import { useParams } from "react-router-dom";
import { Page } from "../../../../components/page/Page";
import { useEvent } from "../../../../hooks/useEvent";
import { Typography } from "tabler-react-2";
import { EventPage } from "../../../../components/eventPage/EventPage";
import { useCampaigns } from "../../../../hooks/useCampaigns";

export const Event = () => {
  const { eventId } = useParams();
  const { event, loading, error, refetch } = useEvent({ eventId });
  const { campaigns } = useCampaigns({ eventId });

  if (loading)
    return (
      <Page title="Event">
        <Typography.Text>Loading...</Typography.Text>
      </Page>
    );

  return (
    <EventPage title="Event">
      {JSON.stringify(campaigns)}
      {/* <Typography.H5 className={"mb-0 text-secondary"}>EVENT</Typography.H5>
      <Typography.H1>{event?.name}</Typography.H1> */}
    </EventPage>
  );
};
