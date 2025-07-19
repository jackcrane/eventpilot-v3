import { prisma } from "#prisma";
import { sendUpdateNotification } from "./push.js";

const serialNumber = "cmd9opm7o00018ox2zznb34i7";

export const triggerPassUpdate = async (serialNumber) => {
  // 1) update the updatedAt so your GET /passes endpoint returns 200 instead of 304
  await prisma.pass.update({
    where: { id: serialNumber },
    data: { updatedAt: new Date() },
  });

  // 2) send the APN “content-available” notification
  await sendUpdateNotification(serialNumber, { userVisible: true });
};

await triggerPassUpdate(serialNumber);
