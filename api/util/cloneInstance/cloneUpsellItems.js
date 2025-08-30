export const cloneUpsellItems = async ({
  tx,
  eventId,
  fromInstanceId,
  toInstanceId,
  summary,
}) => {
  const upsells = await tx.upsellItem.findMany({
    where: { instanceId: fromInstanceId, deleted: false },
  });

  for (const u of upsells) {
    await tx.upsellItem.create({
      data: {
        eventId,
        instanceId: toInstanceId,
        name: u.name,
        description: u.description,
        price: u.price,
        inventory: u.inventory,
        order: u.order,
      },
    });
    summary.upsellItems++;
  }
};

