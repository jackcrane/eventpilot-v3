export const cloneRegistrationPeriodPricing = async ({
  tx,
  fromInstanceId,
  toInstanceId,
  periodMap,
  tierMap,
  summary,
}) => {
  const pricings = await tx.registrationPeriodPricing.findMany({
    where: { instanceId: fromInstanceId, deleted: false },
  });

  for (const rp of pricings) {
    const newPeriodId = periodMap.get(rp.registrationPeriodId);
    const newTierId = tierMap.get(rp.registrationTierId);
    if (!newPeriodId || !newTierId) continue;

    await tx.registrationPeriodPricing.create({
      data: {
        eventId: rp.eventId ?? null,
        instanceId: toInstanceId,
        registrationPeriodId: newPeriodId,
        registrationTierId: newTierId,
        price: rp.price,
        available: rp.available,
      },
    });
    summary.regPeriodPricing++;
  }
};

