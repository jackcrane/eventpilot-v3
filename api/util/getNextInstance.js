import { prisma } from "#prisma";

export const getNextInstance = async (eventId, canBeActive = true) => {
  const now = new Date();
  const instances = await prisma.eventInstance.findMany({
    where: { eventId, deleted: false },
  });

  // include active + future if canBeActive, otherwise only future
  const eligible = canBeActive
    ? instances.filter((i) => i.endTime.getTime() > now.getTime())
    : instances.filter((i) => i.startTime.getTime() > now.getTime());

  if (eligible.length === 0) {
    return null;
  }

  return eligible.reduce((a, b) =>
    a.startTime.getTime() < b.startTime.getTime() ? a : b
  );
};
