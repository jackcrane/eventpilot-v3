import { Typography, Button, Input } from "tabler-react-2";
import { Page } from "../../components/page/Page";
import { useEvents } from "../../hooks/useEvents";
import { EventCard } from "../../components/eventCard/EventCard";

export const Home = () => {
  const { events, loading, createEventModal, CreateEventModalElement } =
    useEvents();
  return (
    <Page title="Home">
      {CreateEventModalElement}
      <Typography.H5 className={"mb-0 text-secondary"}>
        EVENTPILOT
      </Typography.H5>
      <Typography.H1>Your events</Typography.H1>
      {loading && <Typography.Text>Loading...</Typography.Text>}
      <Button onClick={() => createEventModal()} className={"mb-3"}>
        Create Event
      </Button>
      {events?.length === 0 ? (
        <>
          <Typography.Text>No events yet</Typography.Text>
        </>
      ) : (
        <>
          {events?.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </>
      )}
    </Page>
  );
};
