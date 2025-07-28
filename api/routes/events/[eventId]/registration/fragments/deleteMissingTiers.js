export const deleteMissingTiers = async (tx, existing, incomingDbIds) => {
  const toDelete = existing
    .filter((t) => !incomingDbIds.includes(t.id))
    .map((t) => t.id);
  if (toDelete.length) {
    console.log("Deleting tiers", toDelete);

    await tx.registrationTier.updateMany({
      where: { id: { in: toDelete } },
      data: { deleted: true },
    });
  }
};
