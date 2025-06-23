import { Row } from "../../util/Flex";
import { Typography, Spinner, EnclosedSelectGroup } from "tabler-react-2";
import styles from "./shiftfinder.module.css";
import { useEffect, useState } from "react";
import { useLocations } from "../../hooks/useLocations";
import { useParams } from "react-router-dom";
import moment from "moment-timezone";
import { useLocation } from "../../hooks/useLocation";
import classNames from "classnames";
import { utc } from "../tzDateTime/valueToUtc";

const flatShifts = (jobs) =>
  Object.values(jobs)
    .flatMap((jobMap) => Object.values(jobMap).flat())
    .map((item) => item.s);

export const ShiftFinder = ({ eventId, onSelectedShiftChange }) => {
  const [locations, setLocations] = useState([]);
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    onSelectedShiftChange(flatShifts(shifts));
  }, [shifts]);

  return (
    <div>
      <LocationPicker
        locations={locations}
        setLocations={setLocations}
        eventId={eventId}
      />
      <JobPicker
        locations={locations}
        jobs={shifts}
        setJobs={setShifts}
        eventId={eventId}
      />
    </div>
  );
};

const LocationPicker = ({ locations, setLocations, eventId }) => {
  const { locations: locs, loading } = useLocations({ eventId });

  if (loading) return <Spinner />;

  return (
    <div className={"mb-3"}>
      <Typography.H5 className={"mb-0 text-secondary"}>STEP 1</Typography.H5>
      <Typography.H2 className={"mb-0"}>Pick a location</Typography.H2>
      <Typography.Text>
        Pick one or more locations where you want to volunteer. Keep in mind
        that multiple locations may be at the same time, so be sure you don't
        double-book yourself.
      </Typography.Text>
      <div className={"mt-3"}>
        <EnclosedSelectGroup
          items={locs.map((l) => ({
            value: l.id,
            label: (
              <div>
                <Typography.H4 className={"mb-0"}>{l.name}</Typography.H4>
                <Typography.Text className={"mb-1"}>
                  {l.description}
                </Typography.Text>
                <Typography.Text className={"mb-1"}>
                  {[l.address, l.city, l.state]
                    .filter((v) => v.length > 0)
                    .join(", ")}
                </Typography.Text>
                <Typography.Text className={"mb-0"}>
                  {moment(l.startTime)
                    .tz(utc(l.startTimeTz))
                    .format("MMM D, h:mm a")}
                  {" - "}
                  {moment(l.endTime)
                    .tz(utc(l.endTimeTz))
                    .format("MMM D, h:mm a")}
                </Typography.Text>
              </div>
            ),
          }))}
          value={locations}
          onChange={(v) => {
            setLocations(v);
          }}
          direction="column"
          multiple
        />
      </div>
    </div>
  );
};

const JobPicker = ({ locations, jobs, setJobs, eventId }) => {
  return (
    <div>
      <Typography.H5 className={"mb-0 text-secondary"}>STEP 2</Typography.H5>
      <Typography.H2 className={"mb-0"}>Pick some jobs & shifts</Typography.H2>
      <Typography.Text>
        Pick the jobs you want to volunteer for. Keep in mind that multiple jobs
        may be at the same time, so be sure you don't double-book yourself.
      </Typography.Text>
      {locations.map((l) => (
        <_SingleLocationJobPicker
          key={l.id}
          locationId={l.value}
          jobs={jobs}
          setJobs={setJobs}
          eventId={eventId}
        />
      ))}
    </div>
  );
};

const _SingleLocationJobPicker = ({ eventId, locationId, jobs, setJobs }) => {
  const { location, loading } = useLocation({
    eventId,
    locationId,
    includeShifts: true,
  });

  const hasConflict = (shiftId, startTime, endTime) => {
    return "";
    // Get all selected shifts except the one we're checking
    const flatShifts = Object.values(jobs)
      .flatMap((jobMap) => Object.values(jobMap).flat())
      .map((item) => item.s)
      .filter((s) => s.id !== shiftId);

    const conflicts = flatShifts.some((s) => {
      const sStart = moment(s.startTime).tz(utc(s.startTimeTz));
      const sEnd = moment(s.endTime).tz(utc(s.endTimeTz));
      return sStart.isBetween(startTime, endTime, null, "[]");
    });
    return conflicts ? "⚠️" : "";
  };

  if (loading) return <Spinner />;

  const registerShift = (jobId, shiftIds) => {
    setJobs((prev) => ({
      ...prev,
      [locationId]: {
        ...(prev[locationId] || {}),
        [jobId]: shiftIds,
      },
    }));
  };

  return (
    <div className={classNames(styles.location, "mb-3")}>
      <div className={styles.locationHeader}>
        <Typography.H3 className={"mb-0"}>{location.name}</Typography.H3>
        <Typography.Text className={"mb-2"}>
          {location.description}
        </Typography.Text>
      </div>
      <div className={styles.locationJobs}>
        {location.jobs.map((job) => (
          <div className={"card p-2 mb-2"} key={job.id}>
            <Typography.H4>{job.name}</Typography.H4>
            {job.description && job.description.length > 0 && (
              <Typography.Text>{job.description}</Typography.Text>
            )}
            <EnclosedSelectGroup
              small
              horizontal
              multiple
              value={jobs[locationId]?.[job.id] || []}
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
                s: s,
              }))}
              onChange={(v) => registerShift(job.id, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
