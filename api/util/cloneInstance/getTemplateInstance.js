import { prisma } from "#prisma";

export const getTemplateInstance = async (fromInstanceId) => {
  return prisma.eventInstance.findUniqueOrThrow({
    where: { id: fromInstanceId },
    select: {
      id: true,
      eventId: true,
      startTime: true,
      endTime: true,
      startTimeTz: true,
      endTimeTz: true,
    },
  });
};

