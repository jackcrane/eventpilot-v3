import { useParams } from "react-router-dom";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { useCampaigns } from "../../../../../hooks/useCampaigns";
import { EventCard } from "../../../../../components/eventCard/EventCard";

export const EventCampaigns = () => {
  const { eventId } = useParams();
  const { campaigns } = useCampaigns({ eventId });
  return (
    <EventPage title="Campaigns">
      {campaigns?.map((c) => (
        <EventCard
          key={c.id}
          event={c}
          includeImage={false}
          toPrefix={`/events/${eventId}/campaigns/`}
        />
      ))}
    </EventPage>
  );
};
