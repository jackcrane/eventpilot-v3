import { shiftDate } from "./helpers.js";

export const cloneRegistrationPeriods = async ({
  tx,
  eventId,
  fromInstanceId,
  toInstanceId,
  deltaMs = 0,
  summary,
}) => {
  const periodMap = new Map();

  const periods = await tx.registrationPeriod.findMany({
    where: { instanceId: fromInstanceId, deleted: false },
  });

  for (const p of periods) {
    const newP = await tx.registrationPeriod.create({
      data: {
        eventId,
        instanceId: toInstanceId,
        name: p.name,
        startTime: shiftDate(p.startTime, deltaMs),
        startTimeTz: p.startTimeTz,
        endTime: shiftDate(p.endTime, deltaMs),
        endTimeTz: p.endTimeTz,
      },
    });
    periodMap.set(p.id, newP.id);
    summary.regPeriods++;
  }

  return { periodMap };
};

