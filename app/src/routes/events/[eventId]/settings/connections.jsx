import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { Typography, Button, Card, Util } from "tabler-react-2";
import { useGmailConnection } from "../../../../../hooks/useGmailConnection";
import toast from "react-hot-toast";

export const EventSettingsConnectionsPage = () => {
  const { eventId } = useParams();
  const { gmailConnection, loading, connect, disconnect } = useGmailConnection({ eventId });

  // handle post-OAuth result via URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmailConnected")) {
      toast.success("Gmail connected");
      params.delete("gmailConnected");
      const url = `${window.location.pathname}?${params.toString()}`.replace(/\?$/, "");
      window.history.replaceState({}, "", url);
    }
    if (params.get("gmailError")) {
      toast.error("Failed to connect Gmail");
      params.delete("gmailError");
      const url = `${window.location.pathname}?${params.toString()}`.replace(/\?$/, "");
      window.history.replaceState({}, "", url);
    }
  }, []);

  return (
    <EventPage title="Settings · Connections" description="Manage external integrations for your event.">
      <Typography.H2>External Connections</Typography.H2>
      <Card title="Gmail" variant="default">
        {gmailConnection ? (
          <>
            <Typography.Text>
              Connected as <b>{gmailConnection.email}</b>
            </Typography.Text>
            <div className="mt-2" />
            <Button variant="danger" onClick={disconnect} disabled={loading}>
              Disconnect Gmail
            </Button>
          </>
        ) : (
          <>
            <Typography.Text>
              Connect your event’s Gmail account to let EventPilot read and send
              emails via Gmail. This will not change your current email system.
            </Typography.Text>
            <div className="mt-2" />
            <Button onClick={connect} disabled={loading}>Connect Gmail</Button>
          </>
        )}
      </Card>
    </EventPage>
  );
};

