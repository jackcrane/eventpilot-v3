import React, { useState } from "react";
import {
  Typography,
  Util,
  Input,
  EnclosedSelectGroup,
  DropdownInput,
  Button,
} from "tabler-react-2";
import { useLocations } from "../../hooks/useLocations";
import { useParams } from "react-router-dom";
import { useJobs } from "../../hooks/useJobs";

export const JobCRUD = ({ value, defaultLocation, onFinish }) => {
  const [formState, setFormState] = useState({
    name: value?.name || "",
    description: value?.description || "",
    capacity: value?.capacity || 0,
    restrictions: value?.restrictions?.map((i) => ({ value: i })) || [],
    location: value?.location || defaultLocation || null,
  });

  const handleChange = (key) => (value) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const { eventId } = useParams();
  const { locations, loading } = useLocations({ eventId });
  const { createJob, updateJob } = useJobs({
    eventId,
    locationId: formState.location,
  });

  return (
    <div style={{ marginBottom: 100 }}>
      <Typography.H5 className="mb-0 text-secondary">JOBS</Typography.H5>
      <Typography.H1>{value ? "Edit Job" : "Create a new Job"}</Typography.H1>
      EventPilot uses jobs and shifts to help you manage your volunteers. A job
      should be a high-level task (think "registration table") that will need to
      be staffed. You then create shifts for each period of time that a
      volunteer can sign up to work.
      <Util.Hr text="Basic Info" />
      <DropdownInput
        label="Location"
        prompt="Select a location"
        items={locations.map((l) => ({
          ...l,
          id: l.id,
          label: l.name,
          dropdownText: l.name,
          searchIndex: `${l.name}`,
        }))}
        value={formState.location}
        onChange={(item) => handleChange("location")(item.id)}
        required
        aprops={{ style: { width: "100%", justifyContent: "space-between" } }}
        className="mb-3"
      />
      <Input
        label="Job Name"
        placeholder="Job Name"
        name="name"
        value={formState.name}
        onInput={(val) => handleChange("name")(val)}
        hint="Pick a descriptive but short name for your job. Commonly this is the name of the location that volunteers will be working or activity that the volunteers will be doing."
        required
      />
      <label className="form-label">Job Description</label>
      <textarea
        placeholder="A more lengthy description of the job and what it entails"
        name="description"
        className="form-control"
        value={formState.description}
        onChange={(e) => handleChange("description")(e.target.value)}
      />
      <Util.Hr text="Restrictions" />
      <Input
        label="Maximum Volunteers"
        placeholder="Maximum Volunteers"
        name="capacity"
        type="number"
        labelDescription={
          parseInt(formState.capacity) === 0 ? "(unlimited)" : null
        }
        value={formState.capacity}
        onInput={(val) => handleChange("capacity")(parseInt(val))}
        hint="The maximum number of volunteers that can sign up to work on this job at one time. You can set this to 0 to allow unlimited volunteers. You can also control this per-shift. If not otherwise set, shifts will inherit the maximum volunteers from the job."
      />
      <label className="form-label">Restrictions</label>
      <EnclosedSelectGroup
        items={[
          { value: "OVER_18", label: "Must be over 18" },
          { value: "OVER_21", label: "Must be over 21" },
          {
            value: "SPECIAL_CERT_REQUIRED",
            label: "Special certification required",
          },
          {
            value: "PHYSICAL_ABILITY",
            label: "Must be physically able-bodied",
          },
          { value: "OTHER", label: "Other" },
        ]}
        value={formState.restrictions}
        onChange={(val) => handleChange("restrictions")(val)}
        multiple
        direction="column"
      />
      <Util.Hr text="Shifts" />
      <Util.Hr text="Finish" />
      <Button
        loading={loading}
        onClick={async () => {
          const lFormState = {
            ...formState,
            restrictions: formState.restrictions?.map((i) => i.value),
          };

          if (value) {
            if (await updateJob(value.id, lFormState)) onFinish?.();
          } else {
            if (await createJob(lFormState)) onFinish?.();
          }
        }}
        className="mt-3"
      >
        {value ? "Update" : "Create"} Job
      </Button>
    </div>
  );
};
