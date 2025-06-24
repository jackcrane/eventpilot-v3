import { Row } from "../../util/Flex";
import {
  Typography,
  Spinner,
  EnclosedSelectGroup,
  Input,
} from "tabler-react-2";
import styles from "./shiftfinder.module.css";
import { useEffect, useState, useRef } from "react";
import { useLocations } from "../../hooks/useLocations";
import moment from "moment-timezone";
import { useLocation } from "../../hooks/useLocation";
import classNames from "classnames";
import { utc } from "../tzDateTime/valueToUtc";
import z from "zod";

const passedShiftSchema = z.array(
  z.object({
    id: z.string(),
    eventId: z.string(),
    locationId: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    startTimeTz: z.string(),
    endTimeTz: z.string(),
    capacity: z.number(),
    open: z.boolean(),
    active: z.boolean(),
    deleted: z.boolean(),
  })
);

export const groupByLocationAndJob = (responses) => {
  const result = [];
  const locationMap = new Map();

  responses.forEach((shift) => {
    const { job, jobId, locationId, ...rest } = shift;
    const shiftData = { ...rest, jobId, locationId };

    // get or create location bucket
    let locEntry = locationMap.get(locationId);
    if (!locEntry) {
      locEntry = job?.location
        ? { ...job.location, jobs: [] }
        : { id: locationId, jobs: [] };
      locationMap.set(locationId, locEntry);
      result.push(locEntry);
    }

    // get or create job bucket within this location
    let jobEntry = locEntry.jobs.find((j) => j.id === jobId);
    if (!jobEntry) {
      jobEntry = job
        ? (() => {
            const { location, ...jobWithoutLocation } = job;
            return { ...jobWithoutLocation, shifts: [] };
          })()
        : { id: jobId, shifts: [] };
      locEntry.jobs.push(jobEntry);
    }

    // add this shift to the job’s list
    jobEntry.shifts.push(shiftData);
  });

  return result;
};

// flattenShifts.js
export const flattenShifts = (locations) =>
  locations.flatMap(({ jobs }) => jobs.flatMap(({ shifts }) => shifts));

export const ShiftFinder = ({
  eventId,
  onSelectedShiftChange,
  shifts: passedShifts,
  fromRUD = false,
}) => {
  const [selectedShifts, setSelectedShifts] = useState(passedShifts);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    if (!passedShiftSchema.safeParse(selectedShifts).success) {
      console.error("ShiftFinder passedShifts is not valid", passedShifts);
      alert("ShiftFinder passedShifts is not valid");
      return null;
    } else {
      const grouped = groupByLocationAndJob(selectedShifts);
      const _locations = grouped.map((g) => ({ value: g.id }));
      setLocations(_locations);
    }
  }, [selectedShifts]);

  const _setSelectedShifts = (locationId, jobId, shifts) => {
    const prevalid = passedShiftSchema.safeParse(shifts);
    if (!prevalid.success) {
      console.error(
        "_setSelectedShifts (pre) shifts shape is not valid",
        shifts,
        prevalid
      );
      alert("_setSelectedShifts (pre) shifts shape is not valid");
      return null;
    }

    const preSelectedShiftsValid = passedShiftSchema.safeParse(selectedShifts);
    if (!preSelectedShiftsValid.success) {
      console.error(
        "_setSelectedShifts (pre) selectedShifts shape is not valid",
        selectedShifts,
        preSelectedShiftsValid
      );
      alert("_setSelectedShifts (pre) selectedShifts shape is not valid");
      return null;
    }

    const grouped = groupByLocationAndJob(selectedShifts);
    // Find the location reference in the grouped array
    let location = grouped.find((g) => g.id === locationId);

    // If the location is not found, we need to add it to the grouped array.
    if (!location) {
      grouped.push({ id: locationId, jobs: [] });
      location = grouped.find((g) => g.id === locationId);
    }

    // Find the job reference in the location's jobs array
    let job = location.jobs.find((j) => j.id === jobId);

    // If the job is not found, we need to add it to the location's jobs array.
    if (!job) {
      location.jobs.push({ id: jobId, shifts: [] });
      job = location.jobs.find((j) => j.id === jobId);
    }

    // Clear out the shifts array for this job
    job.shifts = [];

    // Add the shifts to the job's shifts array
    shifts.forEach((s) => {
      job.shifts.push({
        ...s,
        id: s.id,
        locationId,
        jobId,
      });
    });

    const flattened = flattenShifts(grouped);

    const valid = passedShiftSchema.safeParse(flattened);
    if (!valid.success) {
      console.error(
        "ShiftFinder flattened shifts is not valid",
        flattened,
        valid
      );
      alert("ShiftFinder flattened shifts is not valid");
      return null;
    }

    setSelectedShifts(flattened);
  };

  useEffect(() => {
    // console.log("SelectedShiftsChanged", selectedShifts);
    onSelectedShiftChange?.(selectedShifts);
  }, [selectedShifts]);

  return (
    <div>
      <LocationPicker
        locations={locations}
        setLocations={setLocations}
        eventId={eventId}
        fromRUD={fromRUD}
      />
      <JobPicker
        locations={locations}
        selectedShifts={selectedShifts}
        setSelectedShifts={_setSelectedShifts}
        eventId={eventId}
      />
    </div>
  );
};

const LocationPicker = ({ locations, setLocations, eventId, fromRUD }) => {
  const { locations: locs, loading } = useLocations({ eventId });
  if (loading) return <Spinner />;
  if (!locations) return "No Locations";

  return (
    <div className="mb-3">
      <Typography.H5 className="mb-0 text-secondary">STEP 1</Typography.H5>
      <Typography.H2 className="mb-0">Pick a location</Typography.H2>
      <Typography.Text>
        Pick one or more locations where you want to volunteer. Keep in mind
        that multiple locations may be at the same time, so be sure you don't
        double-book yourself.
      </Typography.Text>
      <div className="mt-3">
        <EnclosedSelectGroup
          items={locs.map((l) => ({
            value: l.id,
            label: (
              <div>
                <Typography.H4 className="mb-0">{l.name}</Typography.H4>
                {!fromRUD && (
                  <>
                    <Typography.Text className="mb-1">
                      {l.description}
                    </Typography.Text>
                    <Typography.Text className="mb-1">
                      {[l.address, l.city, l.state].filter(Boolean).join(", ")}
                    </Typography.Text>
                    <Typography.Text className="mb-0">
                      {moment(l.startTime)
                        .tz(utc(l.startTimeTz))
                        .format("MMM D, h:mm a")}
                      {" - "}
                      {moment(l.endTime)
                        .tz(utc(l.endTimeTz))
                        .format("MMM D, h:mm a")}
                    </Typography.Text>
                  </>
                )}
              </div>
            ),
          }))}
          value={locations.map((l) => ({ value: l.id || l.value }))}
          onChange={setLocations}
          direction="column"
          multiple
        />
      </div>
    </div>
  );
};

const JobPicker = ({
  locations,
  selectedShifts,
  setSelectedShifts,
  eventId,
}) => (
  <div>
    <Typography.H5 className="mb-0 text-secondary">STEP 2</Typography.H5>
    <Typography.H2 className="mb-0">Pick some jobs & shifts</Typography.H2>
    <Typography.Text>
      Pick the jobs you want to volunteer for. Keep in mind that multiple jobs
      may be at the same time, so be sure you don't double-book yourself.
    </Typography.Text>
    {locations.length === 0 && (
      <div className="mb-3">
        <Typography.Text className="mb-0">
          You have to pick at least one location.
        </Typography.Text>
      </div>
    )}
    {locations.map((l) => (
      <_SingleLocationJobPicker
        key={l.value}
        locationId={l.value}
        selectedShifts={selectedShifts}
        setSelectedShifts={setSelectedShifts}
        eventId={eventId}
      />
    ))}
  </div>
);

const _SingleLocationJobPicker = ({
  eventId,
  locationId,
  selectedShifts,
  setSelectedShifts,
}) => {
  const { location, loading } = useLocation({
    eventId,
    locationId,
    includeShifts: true,
  });
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const valid = passedShiftSchema.safeParse(selectedShifts);
    if (!valid.success) {
      console.error(
        "_SingleLocationJobPicker passedShifts is not valid",
        selectedShifts,
        valid
      );
      alert("_SingleLocationJobPicker passedShifts is not valid");
      return null;
    }
  }, [selectedShifts]);

  if (loading || !location) return <Spinner />;

  const hasConflict = (shiftId, startTime, endTime) => {
    return "";
    const current = moment(startTime).tz(utc(location.startTimeTz));
    const end = moment(endTime).tz(utc(location.endTimeTz));
    const others = selectedShifts
      .map((item) => item.s)
      .filter((s) => s.id !== shiftId);

    return others.some((s) => {
      const sStart = moment(s.startTime).tz(utc(s.startTimeTz));
      const sEnd = moment(s.endTime).tz(utc(s.endTimeTz));
      return (
        sStart.isBetween(current, end, null, "[]") ||
        sEnd.isBetween(current, end, null, "[]") ||
        current.isBetween(sStart, sEnd, null, "[]")
      );
    })
      ? "⚠️"
      : "";
  };

  const registerShift = (jobId, wrappers) => {
    let newWrappers = wrappers.map((w) => ({
      ...w,
      ...location.jobs
        .find((j) => j.id === jobId)
        .shifts.find((s) => s.id === w.value),
      jobId,
      locationId,
    }));

    const newRappersIsValid = passedShiftSchema.safeParse(newWrappers);
    if (!newRappersIsValid.success) {
      console.error(
        "ShiftFinder wrappers shape is not valid",
        newWrappers,
        newRappersIsValid
      );
      alert("ShiftFinder wrappers shape is not valid");
      return null;
    }

    setSelectedShifts(locationId, jobId, newWrappers);
    // setSelectedShifts((prev) => [
    //   // remove existing for this job & location
    //   ...prev.filter(
    //     (item) => !(item.s.locationId === locationId && item.s.jobId === jobId)
    //   ),
    //   // add new selections
    //   ...wrappers,
    // ]);
  };

  const filteredJobs = location.jobs.filter((j) =>
    j?.name?.toLowerCase()?.includes(filter?.toLowerCase())
  );

  return (
    <div className={classNames(styles.location, "mb-3")}>
      <div className={styles.locationHeader}>
        <Row justify="space-between" align="center">
          <Typography.H3 className="mb-0" style={{ textAlign: "left" }}>
            {location.name}
          </Typography.H3>
          <Input
            placeholder="Filter jobs"
            onChange={setFilter}
            value={filter}
            size="sm"
            className={"mb-0"}
          />
        </Row>
        <Typography.Text className="mb-2">
          {location.description}
        </Typography.Text>
      </div>
      <div className={styles.locationJobs}>
        {filteredJobs.map((job) => (
          <div className="card p-2 mb-2" key={job.id}>
            <Typography.H4>{job.name}</Typography.H4>
            {job.description && (
              <Typography.Text>{job.description}</Typography.Text>
            )}
            <EnclosedSelectGroup
              small
              horizontal
              multiple
              value={selectedShifts
                .filter(
                  (w) => w.locationId === locationId && w.jobId === job.id
                )
                .map((w) => ({ value: w.id }))}
              items={job.shifts.map((s) => ({
                value: s.id,
                label: `${moment(s.startTime)
                  .tz(utc(s.startTimeTz))
                  .format("h:mm a")} - ${moment(s.endTime)
                  .tz(utc(s.endTimeTz))
                  .format("h:mm a")} ${hasConflict(
                  s.id,
                  s.startTime,
                  s.endTime
                )}`,
                ...s,
              }))}
              onChange={(v) => registerShift(job.id, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
