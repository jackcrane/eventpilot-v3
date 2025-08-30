import { prisma } from "#prisma";

export const createInstance = async ({
  eventId,
  name,
  startTime,
  endTime,
  startTimeTz,
  endTimeTz,
}) => {
  const created = await prisma.eventInstance.create({
    data: { eventId, name, startTime, endTime, startTimeTz, endTimeTz },
  });
  return created;
};

