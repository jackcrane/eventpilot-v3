import { useParams } from "react-router-dom";
import { ProgressCard } from "./ProgressCard";
import { Button, Typography } from "tabler-react-2";
import { useGmailConnection } from "../../hooks/useGmailConnection";

export const GmailProgressCard = () => {
  const { eventId } = useParams();
  const { connect, loading } = useGmailConnection({ eventId });

  return (
    <ProgressCard title="Connect Google Account" icon="brand-google" color="var(--tblr-teal-lt)">
      <Typography.Text>
        Connect your event’s Google account to enable Gmail-powered inbox and
        email sending from EventPilot.
      </Typography.Text>
      <Typography.Text>
        You can disconnect at any time from Settings.
      </Typography.Text>
      <div style={{ marginTop: "auto" }}>
        <Button onClick={connect} loading={loading} outline>
          Connect Google
        </Button>
      </div>
    </ProgressCard>
  );
};

