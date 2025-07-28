export const upsertPeriods = async (tx, periods, eventId) => {
  const map = new Map();
  for (let i = 0; i < periods.length; i++) {
    const { id, name, startTime, endTime, startTimeTz, endTimeTz } = periods[i];
    const inputKey = id ?? `__new_period_${i}`;
    const data = {
      name,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      startTimeTz,
      endTimeTz,
    };
    if (id && isNaN(Number(id))) {
      await tx.registrationPeriod.update({ where: { id }, data });
      map.set(inputKey, id);
    } else {
      const created = await tx.registrationPeriod.create({
        data: { ...data, event: { connect: { id: eventId } } },
      });
      map.set(inputKey, created.id);
    }
  }
  return map;
};
