import { Typography, Button, Input, Card } from "tabler-react-2";
import { Page } from "../../../components/page/Page";
import { useEvents } from "../../../hooks/useEvents";
import { EventCard } from "../../../components/eventCard/EventCard";
import { Row } from "../../../util/Flex";
import { WhatNext } from "../../../components/whatNext/WhatNext";

export const Events = () => {
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
      <Row gap={2} align="flex-start" justify="space-between">
        <div style={{ flex: 1 }}>
          <Button onClick={() => createEventModal()} className={"mb-3"}>
            Create Event
          </Button>
          {events?.length === 0 ? (
            <>
              <Typography.Text>No events yet!</Typography.Text>
            </>
          ) : (
            <>
              {events?.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </>
          )}
        </div>
        {events?.length === 0 && (
          <Card title="What to do next?" style={{ maxWidth: 400 }}>
            <WhatNext />
          </Card>
        )}
      </Row>
    </Page>
  );
};
