import React from "react";
import { Button, Spinner, Typography } from "tabler-react-2";
import { useOffcanvas } from "tabler-react-2/dist/offcanvas";
import { useParams } from "react-router-dom";

import { useSession } from "../../hooks/useSession";
import { RrwebPlayer } from "./RrwebPlayer";

const { H3, Text } = Typography;

// Usage: <RrwebPlayerTrigger sessionId="..." />
// Renders a button that opens an offcanvas containing the rrweb player
export const RrwebPlayerTrigger = ({
  sessionId,
  prompt = "View Session",
  ...buttonProps
}) => {
  const { OffcanvasElement, offcanvas } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1051 },
  });

  const PlayerContent = () => {
    const { eventId } = useParams();
    const { session, loading, error } = useSession({ eventId, sessionId });

    if (loading) return <Spinner />;
    if (error)
      return (
        <Text className="text-danger">Failed to load session replay.</Text>
      );
    if (!session?.events?.length)
      return <Text>Session has no recorded events.</Text>;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <H3 className="mb-2">Session Replay</H3>
        <div style={{ maxWidth: "100%" }}>
          <RrwebPlayer events={session.events} />
        </div>
      </div>
    );
  };

  return (
    <>
      {OffcanvasElement}
      <Button
        disabled={!sessionId}
        onClick={() => offcanvas({ content: <PlayerContent /> })}
        {...buttonProps}
      >
        {prompt}
      </Button>
    </>
  );
};

export default RrwebPlayerTrigger;
