import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { Typography, Input, Button, Util } from "tabler-react-2";
import { useEvent } from "../../../../../hooks/useEvent";

export const EventSettingsContactPage = () => {
  const { eventId } = useParams();
  const { event, loading, updateEvent, mutationLoading } = useEvent({ eventId });

  const [localEvent, setLocalEvent] = useState(event);
  useEffect(() => {
    setLocalEvent(event);
  }, [event]);

  if (!localEvent) return <></>;

  return (
    <EventPage title="Settings · Contact" description="Public contact details and external info.">
      <Typography.H2>Contact & External</Typography.H2>
      <Input
        label="External Contact Email"
        value={localEvent.externalContactEmail}
        onChange={(e) => setLocalEvent({ ...localEvent, externalContactEmail: e })}
        hint="Public point-of-contact email for your event."
      />
      <Input
        useTextarea
        label="Contact Address"
        value={localEvent.primaryAddress}
        onChange={(e) => setLocalEvent({ ...localEvent, primaryAddress: e })}
        hint="Mailing address for public display (optional)."
      />
      <Input
        label="Contact Phone"
        value={localEvent.contactPhone}
        onChange={(e) => setLocalEvent({ ...localEvent, contactPhone: e })}
        hint="Public contact phone for your event."
      />
      <Input
        label="Website"
        value={localEvent.website}
        onChange={(e) => setLocalEvent({ ...localEvent, website: e })}
        hint="If you have a separate website, add it here."
      />
      <Input
        label="Benefiting Organization"
        value={localEvent.organization}
        onChange={(e) => setLocalEvent({ ...localEvent, organization: e })}
        hint="Organization benefiting from your event (optional)."
      />

      <Util.Hr text="Save" />
      <Button onClick={() => updateEvent(localEvent)} loading={mutationLoading}>
        Save
      </Button>
    </EventPage>
  );
};

