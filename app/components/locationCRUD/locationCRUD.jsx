import React, { useState, useEffect } from "react";
import { Typography, Util, Input, Button } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { TzDateTime } from "../tzDateTime/tzDateTime";
import { useParams } from "react-router-dom";
import { useEvent } from "../../hooks/useEvent";
import { useLocations } from "../../hooks/useLocations";

export const LocationCRUD = ({ value, close }) => {
  const { eventId } = useParams();
  const { event } = useEvent({ eventId });
  const { createLocation, editLocation, loading } = useLocations({ eventId });

  const isEdit = Boolean(value && value.id);

  const [formState, setFormState] = useState(() => ({
    name: value?.name || "",
    description: value?.description || "",
    address: value?.address || "",
    city: value?.city || "",
    state: value?.state || "",
    startTime: value?.startTime,
    endTime: value?.endTime,
  }));

  useEffect(() => {
    if (isEdit) {
      setFormState({
        name: value.name || "",
        description: value.description || "",
        address: value.address || "",
        city: value.city || "",
        state: value.state || "",
        startTime: value.startTime,
        endTime: value.endTime,
      });
    }
  }, [isEdit, value]);

  const handleSubmit = async () => {
    if (isEdit) {
      if (await editLocation(value.id, formState)) close?.();
    } else {
      if (await createLocation(formState)) close?.();
    }
  };

  return (
    <div style={{ marginBottom: 100 }}>
      <Typography.H5 className="mb-0 text-secondary">LOCATION</Typography.H5>
      <Typography.H1>
        {isEdit ? "Edit Location" : "Create a new Location"}
      </Typography.H1>
      <p>
        EventPilot uses locations to help you manage your volunteers. A location
        should be a high-level venue that will host multiple jobs. If you only
        have one venue, just create one. If you have multiple venues (like a
        race with a start and finish line), you can create multiple locations.
      </p>
      <Util.Hr text="Basic Info" />
      <Input
        label="Location Name"
        placeholder="Location Name"
        name="name"
        value={formState.name}
        onInput={(val) => setFormState((prev) => ({ ...prev, name: val }))}
        hint="Pick a descriptive but short name for your location. Commonly this is the name of the venue that volunteers will be working, like 'finish line'"
        required
        labelDescription={
          formState.name.length < 2
            ? "At least " + (2 - formState.name.length) + " more characters"
            : formState.name.length > 50
            ? "No more than 50 characters"
            : null
        }
      />
      <div className="mb-3">
        <label className="form-label required">
          Location Description
          <span className="form-label-description">
            {formState.description.length < 10
              ? "At least " +
                (10 - formState.description.length) +
                " more characters"
              : formState.description.length > 200
              ? "No more than 200 characters"
              : null}
          </span>
        </label>
        <textarea
          placeholder="Description"
          name="description"
          className="form-control"
          value={formState.description}
          onChange={(e) =>
            setFormState((prev) => ({ ...prev, description: e.target.value }))
          }
        />
      </div>
      <Input
        label="Address"
        placeholder="Address"
        value={formState.address}
        onInput={(val) => setFormState((prev) => ({ ...prev, address: val }))}
      />
      <Row gap={1}>
        <Input
          style={{ flex: 1 }}
          label="City"
          placeholder="City"
          name="city"
          value={formState.city}
          onInput={(val) => setFormState((prev) => ({ ...prev, city: val }))}
        />
        <Input
          label="State"
          placeholder="State"
          name="state"
          value={formState.state}
          onInput={(val) => setFormState((prev) => ({ ...prev, state: val }))}
        />
      </Row>
      <Util.Hr text="Timing" />
      <TzDateTime
        onChange={(v) => setFormState((prev) => ({ ...prev, startTime: v }))}
        label="Start Time and Date"
        value={formState.startTime}
        defaultTz={event?.defaultTz}
        required
      />
      <TzDateTime
        onChange={(v) => setFormState((prev) => ({ ...prev, endTime: v }))}
        label="End Time and Date"
        value={formState.endTime}
        defaultTz={event?.defaultTz}
        required
      />
      <Util.Hr text="Finish" />
      <Button onClick={handleSubmit} loading={loading}>
        {isEdit ? "Save Changes" : "Create Location"}
      </Button>
    </div>
  );
};
