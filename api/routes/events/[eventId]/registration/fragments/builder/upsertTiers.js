export const upsertTiers = async (tx, tiers, eventId) => {
  const map = new Map();
  for (let i = 0; i < tiers.length; i++) {
    const { id, name, description } = tiers[i];
    const inputKey = id ?? `__new_tier_${i}`;
    const data = { name, description, order: i, eventId };
    if (id && isNaN(Number(id))) {
      await tx.registrationTier.update({ where: { id }, data });
      map.set(inputKey, id);
    } else {
      const created = await tx.registrationTier.create({ data });
      map.set(inputKey, created.id);
    }
  }
  return map;
};
