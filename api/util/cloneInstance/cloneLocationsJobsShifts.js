import { shiftDate } from "./helpers.js";

export const cloneLocationsJobsShifts = async ({
  tx,
  eventId,
  fromInstanceId,
  toInstanceId,
  deltaMs = 0,
  summary,
}) => {
  const map = { location: new Map(), job: new Map() };

  const locations = await tx.location.findMany({
    where: { instanceId: fromInstanceId, deleted: false },
    include: {
      jobs: {
        where: { deleted: false },
        include: {
          shifts: { where: { deleted: false } },
        },
      },
    },
  });

  for (const loc of locations) {
    const newLoc = await tx.location.create({
      data: {
        name: loc.name,
        description: loc.description,
        eventId,
        instanceId: toInstanceId,
        address: loc.address,
        city: loc.city,
        state: loc.state,
        startTime: shiftDate(loc.startTime, deltaMs),
        endTime: shiftDate(loc.endTime, deltaMs),
        startTimeTz: loc.startTimeTz,
        endTimeTz: loc.endTimeTz,
      },
    });
    map.location.set(loc.id, newLoc.id);
    summary.locations++;

    for (const job of loc.jobs) {
      const newJob = await tx.job.create({
        data: {
          name: job.name,
          description: job.description,
          restrictions: job.restrictions,
          capacity: job.capacity,
          eventId,
          instanceId: toInstanceId,
          locationId: newLoc.id,
        },
      });
      map.job.set(job.id, newJob.id);
      summary.jobs++;

      for (const s of job.shifts) {
        await tx.shift.create({
          data: {
            eventId,
            instanceId: toInstanceId,
            locationId: newLoc.id,
            jobId: newJob.id,
            startTime: shiftDate(s.startTime, deltaMs),
            endTime: shiftDate(s.endTime, deltaMs),
            startTimeTz: s.startTimeTz,
            endTimeTz: s.endTimeTz,
            capacity: s.capacity,
            open: s.open,
            active: s.active,
          },
        });
        summary.shifts++;
      }
    }
  }

  return map;
};

