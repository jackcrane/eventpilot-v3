import { PrismaClient } from "@prisma/client";
import chalk from "chalk";
import { createSearchIndexMiddleware } from "./search/indexer.js";

const prisma = new PrismaClient();

prisma.$use(createSearchIndexMiddleware(prisma));

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
