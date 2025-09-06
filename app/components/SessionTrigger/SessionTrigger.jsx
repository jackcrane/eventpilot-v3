import React from "react";
import { Button, Typography } from "tabler-react-2";
import { useOffcanvas } from "tabler-react-2/dist/offcanvas";
import { useParams } from "react-router-dom";
import { useSession } from "../../hooks/useSession";
import { Loading } from "../loading/Loading";
import RrwebPlayer from "../RrwebPlayer/RrwebPlayer";

// Renders a button that opens an offcanvas showing JSON for a session
// Props: { sessionId: string, eventId?: string, label?: string, ...buttonProps }
export const SessionTrigger = ({
  sessionId,
  eventId: eventIdProp,
  label = "View Session",
  ...buttonProps
}) => {
  const { eventId: eventIdFromParams } = useParams();
  const eventId = eventIdProp || eventIdFromParams;

  const { session, loading, error } = useSession({ eventId, sessionId });

  const { offcanvas, OffcanvasElement } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1051 },
  });

  const Content = () => (
    <div>
      <Typography.H3 className="mb-2">Session {sessionId}</Typography.H3>
      {loading ? (
        <Loading />
      ) : error ? (
        <Typography.Text variant="danger">
          Error loading session
        </Typography.Text>
      ) : (
        <RrwebPlayer events={session?.events || []} />
      )}
    </div>
  );

  return (
    <>
      {OffcanvasElement}
      <Button
        onClick={() => offcanvas({ content: <Content /> })}
        {...buttonProps}
      >
        {label}
      </Button>
    </>
  );
};

export default SessionTrigger;
