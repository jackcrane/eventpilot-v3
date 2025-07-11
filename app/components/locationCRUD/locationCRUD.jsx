import React, { useState, useEffect } from "react";
import { Typography, Util, Input, Button } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { TzDateTime } from "../tzDateTime/tzDateTime";
import { useParams } from "react-router-dom";
import { useEvent } from "../../hooks/useEvent";
import { useLocations } from "../../hooks/useLocations";
import moment from "moment";

export const LocationCRUD = ({ value, close }) => {
  const { eventId } = useParams();
  const { event } = useEvent({ eventId });
  const { createLocation, editLocation, loading } = useLocations({ eventId });

  const isEdit = Boolean(value?.id);

  const initStart = value?.startTime || null;
  const initStartTz = value?.startTimeTz || event?.defaultTz || "";
  const initEnd = value?.endTime || null;
  const initEndTz = value?.endTimeTz || event?.defaultTz || "";

  const [formState, setFormState] = useState({
    name: value?.name || "",
    description: value?.description || "",
    address: value?.address || "",
    city: value?.city || "",
    state: value?.state || "",
    startTime: initStart,
    startTimeTz: initStartTz,
    endTime: initEnd,
    endTimeTz: initEndTz,
  });

  useEffect(() => {
    if (!isEdit) return;
    setFormState({
      name: value.name,
      description: value.description,
      address: value.address,
      city: value.city,
      state: value.state,
      startTime: value.startTime,
      startTimeTz: value.startTimeTz,
      endTime: value.endTime,
      endTimeTz: value.endTimeTz,
    });
  }, [isEdit, value]);

  const handleSubmit = async () => {
    const payload = { ...formState };
    if (isEdit) {
      if (await editLocation(value.id, payload)) close?.();
    } else {
      if (await createLocation(payload)) close?.();
    }
  };

  useEffect(() => {
    // Register a location creator for the tour
    window.EVENTPILOT__INTERNAL_CREATE_LOCATION = async () => {
      const location = {
        name: "Tour Location",
        description: "A demo location created for the tour.",
        address: "1234 Main St",
        city: "Cincinnati",
        state: "Ohio",
        startTime: moment()
          .add(30, "days")
          .set("minutes", 0)
          .format("YYYY-MM-DD HH:mm"),
        startTimeTz: "Eastern Standard Time",
        endTime: moment()
          .add(30, "days")
          .add(6, "hours")
          .set("minutes", 0)
          .format("YYYY-MM-DD HH:mm"),
        endTimeTz: "Eastern Standard Time",
      };
      await createLocation(location);
    };
    window.EVENTPILOT__INTERNAL_CLOSE_LOCATION_CRUD = close;
  }, []);

  return (
    <div style={{ marginBottom: 100 }} className="tour__location-crud">
      <Typography.H5 className="mb-0 text-secondary">LOCATION</Typography.H5>
      <Typography.H1>
        {isEdit ? "Edit Location" : "Create a new Location"}
      </Typography.H1>
      <p>EventPilot uses locations to help you manage your volunteers…</p>
      <Util.Hr text="Basic Info" />

      <Input
        label="Location Name"
        placeholder="Location Name"
        value={formState.name}
        onInput={(v) => setFormState((prev) => ({ ...prev, name: v }))}
        required
      />

      <div className="mb-3">
        <label className="form-label required">
          Location Description
          <span className="form-label-description">
            {formState.description.length < 10
              ? `At least ${10 - formState.description.length} more characters`
              : formState.description.length > 200
              ? "No more than 200 characters"
              : null}
          </span>
        </label>
        <textarea
          className="form-control"
          placeholder="Description"
          value={formState.description}
          onChange={(e) =>
            setFormState((prev) => ({
              ...prev,
              description: e.target.value,
            }))
          }
        />
      </div>

      <Input
        label="Address"
        placeholder="Address"
        value={formState.address}
        onInput={(v) => setFormState((prev) => ({ ...prev, address: v }))}
      />

      <Row gap={1}>
        <Input
          style={{ flex: 1 }}
          label="City"
          placeholder="City"
          value={formState.city}
          onInput={(v) => setFormState((prev) => ({ ...prev, city: v }))}
        />
        <Input
          label="State"
          placeholder="State"
          value={formState.state}
          onInput={(v) => setFormState((prev) => ({ ...prev, state: v }))}
        />
      </Row>

      <Util.Hr text="Timing" />

      <TzDateTime
        label="Start Time and Date"
        value={formState.startTime}
        tz={formState.startTimeTz}
        required
        onChange={([dt, tz]) =>
          setFormState((prev) => ({
            ...prev,
            startTime: dt,
            startTimeTz: tz,
          }))
        }
        className="tour__tz-datetime-start"
      />

      <TzDateTime
        label="End Time and Date"
        afterLabel={
          <Button
            size="sm"
            className="tour__tz-datetime-copy"
            outline
            onClick={() =>
              setFormState((prev) => ({
                ...prev,
                endTime: prev.startTime,
                endTimeTz: prev.startTimeTz,
              }))
            }
          >
            Copy from Start Time
          </Button>
        }
        value={formState.endTime}
        tz={formState.endTimeTz}
        required
        onChange={([dt, tz]) =>
          setFormState((prev) => ({
            ...prev,
            endTime: dt,
            endTimeTz: tz,
          }))
        }
      />

      <Util.Hr text="Finish" />
      <Button onClick={handleSubmit} loading={loading}>
        {isEdit ? "Save Changes" : "Create Location"}
      </Button>
    </div>
  );
};
