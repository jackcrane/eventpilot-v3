import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import chalk from "chalk";

prisma.$use(async (params, next) => {
  const before = Date.now();

  const result = await next(params);

  const after = Date.now();

  console.log(
    chalk.blueBright`[prisma]`,
    chalk.greenBright(params.model + "." + params.action),
    chalk.yellowBright(`[${after - before}ms]`)
  );

  return result;
});

export { prisma };
