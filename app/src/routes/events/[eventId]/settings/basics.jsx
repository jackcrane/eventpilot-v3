import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { Typography, Input, Button, Util, Card } from "tabler-react-2";
import { Row } from "../../../../../util/Flex";
import { TzPicker } from "../../../../../components/tzDateTime/tzDateTime";
import { Dropzone } from "../../../../../components/dropzone/Dropzone";
import { useEvent } from "../../../../../hooks/useEvent";

export const EventSettingsBasicsPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const {
    event,
    loading,
    updateEvent,
    mutationLoading,
    DeleteConfirmElement,
    deleteEvent,
  } = useEvent({ eventId });

  const [localEvent, setLocalEvent] = useState(event);
  useEffect(() => {
    setLocalEvent(event);
  }, [event]);

  if (!localEvent) return <></>;

  return (
    <EventPage title="Settings · Basics" description="Manage the core details for your event.">
      {DeleteConfirmElement}
      <Row gap={2} align="flex-start">
        <div style={{ flex: 1 }}>
          <Typography.H2>Basics</Typography.H2>
          <Input
            label="Event Name"
            value={localEvent.name}
            onChange={(e) => setLocalEvent({ ...localEvent, name: e })}
            hint="The name of your event."
            variant={
              localEvent.name?.length > 0 && localEvent.name?.length < 2
                ? "danger"
                : null
            }
            required
          />

          <div className="mt-3" />
          <label className="form-label required">Logo or Image</label>
          <Row gap={1}>
            {localEvent.logo?.location && (
              <a href={localEvent.logo.location} target="_blank">
                <img
                  src={localEvent.logo.location}
                  alt="Event Logo"
                  style={{ maxWidth: 40, maxHeight: 40 }}
                  className={"mb-3"}
                />
              </a>
            )}
            <Dropzone
              onSuccessfulUpload={(d) =>
                setLocalEvent({ ...localEvent, logoFileId: d.fileId })
              }
              style={{ flex: 1 }}
            />
          </Row>
          <Typography.Text className="form-hint">
            Upload a new image to replace the current logo.
          </Typography.Text>

          <div className="mt-3" />
          <label className="form-label">Banner Image</label>
          <Row gap={1}>
            {localEvent.banner?.location && (
              <a href={localEvent.banner.location} target="_blank">
                <img
                  src={localEvent.banner.location}
                  alt="Event Banner"
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
            Your banner appears on the event homepage and registration pages.
          </Typography.Text>

          <Input
            label="Event Description"
            value={localEvent.description}
            onChange={(e) => setLocalEvent({ ...localEvent, description: e })}
            hint="A short description of your event."
            variant={
              localEvent.description?.length > 0 &&
              localEvent.description?.length < 10
                ? "danger"
                : null
            }
            required
          />
          <Input
            label="Event Slug"
            value={localEvent.slug}
            onChange={(e) => setLocalEvent({ ...localEvent, slug: e })}
            hint="Lowercase, hyphenated identifier used in URLs."
            variant={
              localEvent.slug?.length > 0 &&
              (localEvent.slug?.length < 3 || !localEvent.slug?.match(/^[a-z0-9-]+$/))
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
        </div>

        <div style={{ flex: 1 }}>
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

