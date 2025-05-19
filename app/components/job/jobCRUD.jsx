import React, { useState } from "react";
import {
  Typography,
  Util,
  Input,
  EnclosedSelectGroup,
  DropdownInput,
  Button,
  Alert,
} from "tabler-react-2";
import { useParams } from "react-router-dom";
import moment from "moment";
import { useLocations } from "../../hooks/useLocations";
import { useJobs } from "../../hooks/useJobs";
import { useLocation } from "../../hooks/useLocation";
import { TzDateTime } from "../tzDateTime/tzDateTime";
import { Icon } from "../../util/Icon";

export const JobCRUD = ({ value, defaultLocation, onFinish }) => {
  const { eventId } = useParams();
  const { locations, loading } = useLocations({ eventId });
  const { createJob, updateJob } = useJobs({
    eventId,
    locationId: value?.location || defaultLocation,
  });
  const { location } = useLocation({
    eventId,
    locationId: value?.location || defaultLocation,
  });

  console.log(value);

  const initShifts = (value?.shifts || []).map((s) => ({ ...s }));

  const [formState, setFormState] = useState({
    name: value?.name || "",
    description: value?.description || "",
    capacity: value?.capacity || 0,
    restrictions: value?.restrictions?.map((r) => ({ value: r })) || [],
    location: value?.location || defaultLocation || null,
    shifts: initShifts,
  });

  const handleChange = (key) => (val) =>
    setFormState((prev) => ({ ...prev, [key]: val }));

  const updateShift = (idx, newShift) =>
    setFormState((prev) => ({
      ...prev,
      shifts: [
        ...prev.shifts.slice(0, idx),
        newShift,
        ...prev.shifts.slice(idx + 1),
      ],
    }));

  const addShift = () => {
    const last = formState.shifts.slice(-1)[0];
    const defaultStart = last?.endTime || location?.startTime || null;
    const defaultStartTz = last?.endTimeTz || location?.startTimeTz || "";

    setFormState((prev) => ({
      ...prev,
      shifts: [
        ...prev.shifts,
        {
          capacity: null,
          startTime: defaultStart,
          startTimeTz: defaultStartTz,
          endTime: null,
          endTimeTz: "",
          id: null,
        },
      ],
    }));
  };

  const submit = async () => {
    const payload = {
      ...formState,
      restrictions: formState.restrictions.map((r) => r.value),
      shifts: formState.shifts.map(
        ({ capacity, startTime, startTimeTz, endTime, endTimeTz, id }) => ({
          capacity: capacity === null ? formState.capacity : capacity,
          startTime,
          startTimeTz,
          endTime,
          endTimeTz,
          id,
        })
      ),
    };
    const ok = value
      ? await updateJob(value.id, payload)
      : await createJob(payload);
    if (ok) onFinish?.();
  };

  return (
    <div style={{ marginBottom: 100 }}>
      <Typography.H5 className="mb-0 text-secondary">JOBS</Typography.H5>
      <Typography.H1>{value ? "Edit Job" : "Create a new Job"}</Typography.H1>
      <Util.Hr text="Basic Info" />

      <DropdownInput
        label="Location"
        prompt="Select a location"
        items={locations.map((l) => ({
          ...l,
          id: l.id,
          label: l.name,
          dropdownText: l.name,
          searchIndex: l.name,
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
        onInput={(v) => handleChange("name")(v)}
        required
      />

      <label className="form-label">Job Description</label>
      <textarea
        className="form-control"
        placeholder="A more lengthy description"
        value={formState.description}
        onChange={(e) => handleChange("description")(e.target.value)}
      />

      <Util.Hr text="Restrictions" />

      <Input
        label="Maximum Volunteers"
        type="number"
        value={formState.capacity}
        onInput={(v) => handleChange("capacity")(parseInt(v, 10))}
        labelDescription={formState.capacity === 0 ? "(unlimited)" : null}
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
          { value: "PHYSICAL_ABILITY", label: "Physically able-bodied" },
          { value: "OTHER", label: "Other" },
        ]}
        value={formState.restrictions}
        onChange={(v) => handleChange("restrictions")(v)}
        multiple
        direction="column"
      />

      <Util.Hr text="Shifts" />

      {formState.shifts.map((s, idx) => (
        <div key={idx} className="card p-2 mb-3">
          <Input
            type="number"
            value={s.capacity === null ? formState.capacity : s.capacity}
            onInput={(v) =>
              updateShift(idx, {
                ...s,
                capacity: parseInt(v, 10),
              })
            }
            prependedText="Capacity"
            appendedText={
              s.capacity === null
                ? "(inherited)"
                : s.capacity === 0
                ? "Unlimited"
                : ""
            }
            required
            className="mb-0"
          />

          <TzDateTime
            value={s.startTime}
            label="Start Time"
            required
            tz={s.startTimeTz}
            onChange={([dt, tz]) =>
              updateShift(idx, {
                ...s,
                startTime: dt,
                startTimeTz: tz,
              })
            }
          />

          <TzDateTime
            value={s.endTime}
            label="End Time"
            afterLabel={
              <Button
                size="sm"
                outline
                onClick={() =>
                  updateShift(idx, {
                    ...s,
                    endTime: s.startTime,
                    endTimeTz: s.startTimeTz,
                  })
                }
              >
                Copy from Start Time
              </Button>
            }
            required
            tz={s.startTimeTz}
            minDate={
              s.startTime
                ? new Date(s.startTime).toISOString().slice(0, 10)
                : ""
            }
            minTime={
              s.startTime
                ? new Date(s.startTime).toISOString().slice(11, 16)
                : ""
            }
            onChange={([dt, tz]) =>
              updateShift(idx, {
                ...s,
                endTime: dt,
                endTimeTz: tz,
              })
            }
          />

          {s.startTime && s.endTime && (
            <>
              {moment(s.startTime).isAfter(moment(s.endTime)) ? (
                <Alert
                  variant="danger"
                  title={"Error"}
                  icon={<Icon size="24px" i="clock-exclamation" />}
                >
                  End time must be after start time
                </Alert>
              ) : (
                <Typography.Text>
                  This shift is{" "}
                  {moment(s.startTime).from(moment(s.endTime), true)} long
                </Typography.Text>
              )}
              {moment(s.startTime).isBefore(location.startTime) && (
                <Alert
                  variant="warning"
                  title={
                    "Time out of bounds (Shift starts before location starts)"
                  }
                  icon={<Icon size="24px" i="clock-exclamation" />}
                >
                  Shift start time is before the location start time. This is
                  allowed, but may not be what you want. Your shift starts on{" "}
                  {moment(s.startTime).format("MMM DD, h:mm a")} but your
                  location starts on{" "}
                  {moment(location.startTime).format("MMM DD, h:mm a")},{" "}
                  <u>
                    which is{" "}
                    {moment(s.startTime).from(moment(location.startTime), true)}{" "}
                    before the location starts.
                  </u>
                </Alert>
              )}
              {moment(s.endTime).isAfter(location.endTime) && (
                <Alert
                  variant="warning"
                  title={"Time out of bounds (Shift ends after location ends)"}
                  icon={<Icon size="24px" i="clock-exclamation" />}
                >
                  Shift end time is after the location end time. This is
                  allowed, but may not be what you want. Your shift ends on{" "}
                  {moment(s.endTime).format("MMM DD, h:mm a")} but your location
                  ends on {moment(location.endTime).format("MMM DD, h:mm a")},{" "}
                  <u>
                    which is{" "}
                    {moment(s.endTime).from(moment(location.endTime), true)}{" "}
                    after the location ends.
                  </u>
                </Alert>
              )}
            </>
          )}

          <Button
            onClick={() =>
              setFormState((prev) => ({
                ...prev,
                shifts: prev.shifts.filter((_, i) => i !== idx),
              }))
            }
          >
            Delete
          </Button>
        </div>
      ))}

      <Button onClick={addShift}>
        Create {formState.shifts.length === 0 ? "a" : "another"} shift
      </Button>

      <Util.Hr text="Finish" />
      <Button loading={loading} onClick={submit} className="mt-3">
        {value ? "Update" : "Create"} Job
      </Button>
    </div>
  );
};
