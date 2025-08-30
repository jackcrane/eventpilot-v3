import React, { useEffect, useState } from "react";
import { EventPage } from "../../../../components/eventPage/EventPage";
import { Typography, Input, Button, Util, Card } from "tabler-react-2";
import { useEvent } from "../../../../hooks/useEvent";
import { useNavigate, useParams } from "react-router-dom";
import { Row } from "../../../../util/Flex";
import { TzPicker } from "../../../../components/tzDateTime/tzDateTime";
import { Dropzone } from "../../../../components/dropzone/Dropzone";
import { Icon } from "../../../../util/Icon";

export const EventSettings = () => {
  const { eventId } = useParams();
  const {
    event,
    loading,
    updateEvent,
    mutationLoading,
    DeleteConfirmElement,
    deleteEvent,
  } = useEvent({
    eventId,
  });
  const navigate = useNavigate();

  const [localEvent, setLocalEvent] = useState(event);
  useEffect(() => {
    setLocalEvent(event);
  }, [event]);

  useEffect(() => {
    console.log(localEvent);
  }, [localEvent]);

  if (!localEvent) return <></>;

  return (
    <EventPage title="Settings">
      {DeleteConfirmElement}
      <Typography.Text>
        This is the settings page for your event. You can manage and customize
        your event's basics here. Be careful, some changes may affect your
        event's visibility.
      </Typography.Text>
      <Row gap={2} align="flex-start">
        <div style={{ flex: 1 }}>
          <Typography.H2>Basics</Typography.H2>
          <Input
            label="Event Name"
            value={localEvent.name}
            onChange={(e) => setLocalEvent({ ...localEvent, name: e })}
            hint="The name of your event. This should be what your event is primarily known as. This field is required and must be at least 2 characters."
            variant={
              localEvent.name.length > 0 && localEvent.name.length < 2
                ? "danger"
                : null
            }
            required
          />
          <>
            <div className="mt-3" />
            <label className="form-label required">Logo or Image</label>
            <Row gap={1}>
              <a href={localEvent.logo.location} target="_blank">
                <img
                  src={localEvent.logo.location}
                  alt="Event Logo"
                  style={{ maxWidth: 40, maxHeight: 40 }}
                  className={"mb-3"}
                />
              </a>
              <Dropzone
                onSuccessfulUpload={(d) =>
                  setLocalEvent({ ...localEvent, logoFileId: d.fileId })
                }
                style={{ flex: 1 }}
              />
            </Row>
            <Typography.Text className="form-hint">
              You already have an image uploaded as the logo, but you can upload
              a new one here.
            </Typography.Text>
          </>
          <>
            <div className="mt-3" />
            <label className="form-label">Banner Image</label>
            <Row gap={1}>
              {localEvent.banner && (
                <a href={localEvent.banner.location} target="_blank">
                  <img
                    src={localEvent.banner.location}
                    alt="Event Logo"
                    style={{ maxWidth: 40, maxHeight: 40 }}
                    className={"mb-3"}
                  />
                </a>
              )}
              <Dropzone
                onSuccessfulUpload={(d) =>
                  setLocalEvent({ ...localEvent, bannerFileId: d.fileId })
                }
                style={{ flex: 1 }}
              />
            </Row>
            <Typography.Text className="form-hint">
              Your banner image will be shown on the homepage of your event and
              on registration pages.
            </Typography.Text>
          </>
          <Input
            label="Event Description"
            value={localEvent.description}
            onChange={(e) => setLocalEvent({ ...localEvent, description: e })}
            hint="A short description of your event. This should be a short description of what your event is about. This field is required and must be at least 10 characters."
            variant={
              localEvent.description.length > 0 &&
              localEvent.description.length < 10
                ? "danger"
                : null
            }
            required
          />
          <Input
            label="Event Slug"
            value={localEvent.slug}
            onChange={(e) => setLocalEvent({ ...localEvent, slug: e })}
            hint="The slug of your event. This should be a short, lowercase, hyphenated string. This field is required and must be at least 3 characters and can only contain lowercase letters, numbers, and hyphens. Slugs are used to generate URLs for your events, so be sure to choose something that is memorable, easy to spell, and reflects your event well. Be careful changing this field as it can affect your event's visibility."
            variant={
              localEvent.slug.length > 0 &&
              localEvent.slug.length < 3 &&
              !localEvent.slug.match(/^[a-z0-9-]+$/)
                ? "danger"
                : null
            }
            required
          />
          <TzPicker
            required
            aprops={{
              style: { width: "100%", justifyContent: "space-between" },
            }}
            prompt={"Select a default timezone"}
            onChange={(d) => setLocalEvent({ ...localEvent, defaultTz: d })}
            value={localEvent.defaultTz}
          />
          <div className="mt-3" />
          <Input
            label="External Contact Email"
            value={localEvent.externalContactEmail}
            hint="The email address of your event's primary point-to-contact. This value will be shown publicly. EventPilot will not use this value to send you any emails, but it should be used to contact you."
            onChange={(e) =>
              setLocalEvent({ ...localEvent, externalContactEmail: e })
            }
          />
          <Input
            useTextarea={true}
            label="Contact Address"
            value={localEvent.primaryAddress}
            onChange={(e) =>
              setLocalEvent({ ...localEvent, primaryAddress: e })
            }
            hint="The address that mail destined for your event and organizers should be sent to. This value will be shown publicly. EventPilot will not send you anything through the mail. This does not have to be the same as the actual location of your event, it could be an office or PO Box. This field is optional."
          />
          <Input
            label="Contact Phone"
            value={localEvent.contactPhone}
            onChange={(e) => setLocalEvent({ ...localEvent, contactPhone: e })}
            hint="The phone number of your event's primary point-to-contact. This value will be shown publicly. EventPilot will not use this value to send you any texts, but will be public so volunteers and participants will be able to find it."
          />
          <Input
            label="Website"
            value={localEvent.website}
            onChange={(e) => setLocalEvent({ ...localEvent, website: e })}
            hint="The URL of your event's website. If your event has a seperate website, you can put that here."
          />
          <Input
            label="Benefiting Organization"
            value={localEvent.organization}
            onChange={(e) => setLocalEvent({ ...localEvent, organization: e })}
            hint="The name of the organization that is benefiting from your event. This field is optional."
          />
        </div>
        <div style={{ flex: 1 }}>
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
            placeholder="https://threads.com/..."
            icon={<Icon i="brand-threads" />}
          />
          <Util.Hr />
          <Card title="Danger Zone" variant="danger">
            <Button
              onClick={() => deleteEvent(() => navigate(`/events`))}
              loading={mutationLoading}
              variant="danger"
            >
              Delete Event
            </Button>
          </Card>
        </div>
      </Row>
      <Util.Hr text="Save" />
      <Button onClick={() => updateEvent(localEvent)} loading={mutationLoading}>
        Save
      </Button>
    </EventPage>
  );
};
