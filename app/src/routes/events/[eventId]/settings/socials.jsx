import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { Typography, Input, Button, Util } from "tabler-react-2";
import { useEvent } from "../../../../../hooks/useEvent";
import { Icon } from "../../../../../util/Icon";

export const EventSettingsSocialsPage = () => {
  const { eventId } = useParams();
  const { event, updateEvent, mutationLoading } = useEvent({ eventId });

  const [localEvent, setLocalEvent] = useState(event);
  useEffect(() => {
    setLocalEvent(event);
  }, [event]);

  if (!localEvent) return <></>;

  return (
    <EventPage title="Settings · Socials" description="Link your event’s social profiles.">
      <Typography.H2>Socials</Typography.H2>
      <Input
        label="Facebook"
        value={localEvent.facebook}
        onChange={(e) => setLocalEvent({ ...localEvent, facebook: e })}
        placeholder="https://facebook.com/..."
        icon={<Icon i="brand-facebook" />}
      />
      <Input
        label="Instagram"
        value={localEvent.instagram}
        onChange={(e) => setLocalEvent({ ...localEvent, instagram: e })}
        placeholder="https://instagram.com/..."
        icon={<Icon i="brand-instagram" />}
      />
      <Input
        label="Twitter/X"
        value={localEvent.twitter}
        onChange={(e) => setLocalEvent({ ...localEvent, twitter: e })}
        placeholder="https://x.com/..."
        icon={<Icon i="brand-x" />}
      />
      <Input
        label="YouTube"
        value={localEvent.youtube}
        onChange={(e) => setLocalEvent({ ...localEvent, youtube: e })}
        placeholder="https://youtube.com/..."
        icon={<Icon i="brand-youtube" />}
      />
      <Input
        label="LinkedIn"
        value={localEvent.linkedin}
        onChange={(e) => setLocalEvent({ ...localEvent, linkedin: e })}
        placeholder="https://linkedin.com/..."
        icon={<Icon i="brand-linkedin" />}
      />
      <Input
        label="TikTok"
        value={localEvent.tiktok}
        onChange={(e) => setLocalEvent({ ...localEvent, tiktok: e })}
        placeholder="https://tiktok.com/..."
        icon={<Icon i="brand-tiktok" />}
      />
      <Input
        label="Snapchat"
        value={localEvent.snapchat}
        onChange={(e) => setLocalEvent({ ...localEvent, snapchat: e })}
        placeholder="https://snapchat.com/..."
        icon={<Icon i="brand-snapchat" />}
      />
      <Input
        label="Reddit"
        value={localEvent.reddit}
        onChange={(e) => setLocalEvent({ ...localEvent, reddit: e })}
        placeholder="https://reddit.com/..."
        icon={<Icon i="brand-reddit" />}
      />
      <Input
        label="Threads"
        value={localEvent.threads}
        onChange={(e) => setLocalEvent({ ...localEvent, threads: e })}
        placeholder="https://threads.net/..."
        icon={<Icon i="brand-threads" />}
      />

      <Util.Hr text="Save" />
      <Button onClick={() => updateEvent(localEvent)} loading={mutationLoading}>
        Save
      </Button>
    </EventPage>
  );
};

