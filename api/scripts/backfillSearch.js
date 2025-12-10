#!/usr/bin/env node
import dotenv from "dotenv";
import { prisma } from "#prisma";
import {
  rebuildSearchIndex,
  withSearchIndexingDisabled,
} from "../util/search/indexer.js";

dotenv.config();

const parseModelsOption = () => {
  const raw = process.argv.slice(2).find((arg) => arg.startsWith("--models="));
  if (!raw) {
    return null;
  }
  const [, value] = raw.split("=", 2);
  if (!value) {
    throw new Error("`--models` requires a comma-separated list of models");
  }
  const models = value
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  if (!models.length) {
    throw new Error("`--models` requires at least one model");
  }
  return models;
};

const requestedModels = parseModelsOption();

const run = async () => {
  const mode = requestedModels ? "partial" : "full";
  const extra = requestedModels ? ` (${requestedModels.join(", ")})` : "";
  console.log(`[search] Starting ${mode} index rebuild${extra}...`);
  const totals = await withSearchIndexingDisabled(() =>
    rebuildSearchIndex(
      prisma,
      requestedModels ? { models: requestedModels } : undefined
    )
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
