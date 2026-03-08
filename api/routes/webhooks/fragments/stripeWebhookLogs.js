import { prisma } from "#prisma";

const findStripeLogByObjectId = async ({ type, objectId }) => {
  if (!type || !objectId) {
    return null;
  }

  return prisma.logs.findFirst({
    where: {
      type,
      data: {
        path: ["id"],
        equals: objectId,
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const ensureStripeLog = async ({
  type,
  objectId,
  data,
  eventId = null,
  crmPersonId = null,
}) => {
  const existing = await findStripeLogByObjectId({ type, objectId });

  if (existing) {
    return prisma.logs.update({
      where: { id: existing.id },
      data: {
        data,
        eventId,
        crmPersonId,
      },
    });
  }

  return prisma.logs.create({
    data: {
      type,
      data,
      eventId,
      crmPersonId,
    },
  });
};

export const syncStripeLogAssociations = async ({
  logIds,
  eventId = null,
  crmPersonId = null,
}) => {
  const uniqueLogIds = Array.from(new Set((logIds || []).filter(Boolean)));

  if (uniqueLogIds.length === 0) {
    return;
  }

  await prisma.logs.updateMany({
    where: {
      id: { in: uniqueLogIds },
    },
    data: {
      eventId,
      crmPersonId,
    },
  });
};
