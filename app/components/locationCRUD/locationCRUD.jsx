import React, { useState } from "react";
import { Typography, Util, Input, Button } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { TzDateTime } from "../tzDateTime/tzDateTime";
import { useParams } from "react-router-dom";
import { useEvent } from "../../hooks/useEvent";
import { useLocations } from "../../hooks/useLocations";

export const LocationCRUD = () => {
  const { eventId } = useParams();
  const { event } = useEvent({ eventId });
  const { createLocation, loading } = useLocations({ eventId });

  const [formState, setFormState] = useState({
    name: "",
  });

  return (
    <div style={{ marginBottom: 100 }}>
      <Typography.H5 className="mb-0 text-secondary">LOCATION</Typography.H5>
      <Typography.H1>Create a new Location</Typography.H1>
      EventPilot uses locations to help you manage your volunteers. A location
      should be a high-level venue that will host multiple jobs. If you only
      have one venue, just create one. If you have multiple venues (like a race
      with a start and finish line), you can create multiple locations.
      <Util.Hr text="Basic Info" />
      <Input
        label="Location Name"
        placeholder="Location Name"
        name="name"
        value={formState.name}
        onInput={(val) => setFormState((prev) => ({ ...prev, name: val }))}
        hint="Pick a descriptive but short name for your location. Commonly this is the name of the venue that volunteers will be working, like 'finish line'"
        required
      />
      <div className="mb-3">
        <label className="form-label">Location Description</label>
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
        label={"Start Time and Date"}
        value={formState.startTime}
        defaultTz={event?.defaultTz}
      />
      <TzDateTime
        onChange={(v) => setFormState((prev) => ({ ...prev, endTime: v }))}
        label={"End Time and Date"}
        value={formState.endTime}
        defaultTz={event?.defaultTz}
      />
      <Util.Hr text="Finish" />
      <Button onClick={() => createLocation(formState)} loading={loading}>
        Create Location
      </Button>
    </div>
  );
};
