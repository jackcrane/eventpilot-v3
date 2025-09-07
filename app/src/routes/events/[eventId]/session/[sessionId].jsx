import React from "react";
import { useParams } from "react-router-dom";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { useSession } from "../../../../../hooks/useSession";
import { Typography } from "tabler-react-2";
import { RrwebPlayer } from "../../../../../components/RrwebPlayer/RrwebPlayer";

export const EventSessionPage = () => {
  const { eventId, sessionId } = useParams();
  const { session, loading, error } = useSession({ eventId, sessionId });

  return (
    <EventPage title="Session" loading={loading} showHr={false}>
      {error ? (
        <Typography.Text className="text-danger">
          Failed to load session replay.
        </Typography.Text>
      ) : !session?.events?.length ? (
        <Typography.Text>Session has no recorded events.</Typography.Text>
      ) : (
        <div style={{ maxWidth: "100%" }}>
          <RrwebPlayer events={session.events} />
        </div>
      )}
    </EventPage>
  );
};

export default EventSessionPage;

