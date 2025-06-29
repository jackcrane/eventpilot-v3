import { prisma } from "#prisma";
import { diffObjects } from "../util/diffObjects.js";

const logId = "cmcf5yshm0003o2h4obizg0sf";

const main = async () => {
  const log = await prisma.logs.findUnique({
    where: { id: logId },
  });

  // console.log(log);

  const diff = diffObjects(log);
  console.log(diff);
};

main();
