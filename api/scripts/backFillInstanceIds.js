// backfillInstanceIds.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const backfillInstanceIds = async () => {
  const defaultInstanceId = "cmdrmx96p00008o02ytjux6gs"; // your EventInstance ID

  // list all the models you made instanceId required on:
  const updates = [
    prisma.formField.updateMany({
      where: { instanceId: null },
      data: { instanceId: defaultInstanceId },
    }),
    prisma.job.updateMany({
      where: { instanceId: null },
      data: { instanceId: defaultInstanceId },
    }),
    prisma.ledgerItem.updateMany({
      where: { instanceId: null },
      data: { instanceId: defaultInstanceId },
    }),
    prisma.location.updateMany({
      where: { instanceId: null },
      data: { instanceId: defaultInstanceId },
    }),
    prisma.registration.updateMany({
      where: { instanceId: null },
      data: { instanceId: defaultInstanceId },
    }),
    prisma.registrationField.updateMany({
      where: { instanceId: null },
      data: { instanceId: defaultInstanceId },
    }),
    prisma.registrationFieldResponse.updateMany({
      where: { instanceId: null },
      data: { instanceId: defaultInstanceId },
    }),
    prisma.registrationPage.updateMany({
      where: { instanceId: null },
      data: { instanceId: defaultInstanceId },
    }),
    prisma.registrationPeriodPricing.updateMany({
      where: { instanceId: null },
      data: { instanceId: defaultInstanceId },
    }),
    prisma.registrationTier.updateMany({
      where: { instanceId: null },
      data: { instanceId: defaultInstanceId },
    }),
    prisma.shift.updateMany({
      where: { instanceId: null },
      data: { instanceId: defaultInstanceId },
    }),
    prisma.upsellItem.updateMany({
      where: { instanceId: null },
      data: { instanceId: defaultInstanceId },
    }),
    prisma.registrationPeriod.updateMany({
      where: { instanceId: null },
      data: { instanceId: defaultInstanceId },
    }),
  ];

  await Promise.all(updates);
};

backfillInstanceIds()
  .then(() => {
    console.log("✅ Backfill complete");
    return prisma.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().then(() => process.exit(1));
  });
