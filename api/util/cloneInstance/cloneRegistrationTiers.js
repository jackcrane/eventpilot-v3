export const cloneRegistrationTiers = async ({
  tx,
  eventId,
  fromInstanceId,
  toInstanceId,
  summary,
}) => {
  const tierMap = new Map();

  const tiers = await tx.registrationTier.findMany({
    where: { instanceId: fromInstanceId, deleted: false },
  });

  for (const t of tiers) {
    const newT = await tx.registrationTier.create({
      data: {
        eventId,
        instanceId: toInstanceId,
        name: t.name,
        description: t.description,
        capacity: t.capacity,
        order: t.order,
      },
    });
    tierMap.set(t.id, newT.id);
    summary.regTiers++;
  }

  return { tierMap };
};

