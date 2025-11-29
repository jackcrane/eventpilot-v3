#!/usr/bin/env node
import dotenv from "dotenv";
import { prisma } from "#prisma";
import {
  rebuildSearchIndex,
  withSearchIndexingDisabled,
} from "../util/search/indexer.js";

dotenv.config();

const run = async () => {
  console.log("[search] Starting full index rebuild...");
  const totals = await withSearchIndexingDisabled(() =>
    rebuildSearchIndex(prisma)
  );
  console.log("[search] Rebuild complete", totals);
};

run()
  .catch((error) => {
    console.error("[search] Rebuild failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
