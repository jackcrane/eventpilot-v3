#!/usr/bin/env node
const path = require("path");
const { pathToFileURL } = require("url");

const apiScript = path.join(__dirname, "..", "api", "scripts", "backfillSearch.js");

import(pathToFileURL(apiScript).href).catch((error) => {
  console.error("[search] Unable to launch API backfill script", error);
  process.exit(1);
});
