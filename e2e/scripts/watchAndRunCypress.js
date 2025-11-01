#!/usr/bin/env node

/**
 * Simple watch runner that re-executes Cypress whenever YAML specs or the
 * generated Cypress specs change. Designed for use inside the e2e Docker
 * workflow where Cypress should re-run automatically in "watch" mode.
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SPECS_DIR = path.join(ROOT, "specs");
const GENERATED_DIR = path.join(ROOT, "cypress", "e2e", "generated");

const cypressArgs = process.argv.slice(2);

let currentRun = null;
let pendingRun = false;
let debounceTimer = null;
let shuttingDown = false;

const log = (message) => {
  console.log(`[watch-e2e] ${message}`);
};

const ensureDirectory = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

ensureDirectory(SPECS_DIR);
ensureDirectory(GENERATED_DIR);

const startRun = () => {
  pendingRun = false;
  log("Starting Cypress run");

  const args = ["cypress", "run", "--browser", "chrome", ...cypressArgs];
  currentRun = spawn("yarn", args, {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });

  currentRun.on("exit", (code, signal) => {
    if (signal) {
      log(`Cypress run terminated with signal ${signal}`);
    } else {
      log(`Cypress run exited with code ${code}`);
    }
    currentRun = null;

    if (shuttingDown) {
      process.exit(code ?? 0);
    }

    if (pendingRun) {
      startRun();
    }
  });
};

const scheduleRun = () => {
  if (shuttingDown) {
    return;
  }

  pendingRun = true;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (!currentRun) {
      startRun();
    } else {
      log("Change detected during Cypress run; will restart after completion");
    }
  }, 150);
};

const watchDirectory = (dir) => {
  log(`Watching ${dir}`);
  fs.watch(dir, { persistent: true }, (_eventType, filename) => {
    if (!filename) {
      scheduleRun();
      return;
    }

    if (filename.endsWith("~") || filename.startsWith(".nfs")) {
      return;
    }

    scheduleRun();
  });
};

watchDirectory(SPECS_DIR);
watchDirectory(GENERATED_DIR);

const shutdown = () => {
  shuttingDown = true;
  log("Shutting down watcher");
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  if (currentRun) {
    currentRun.kill();
  } else {
    process.exit(0);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Kick off the initial run.
scheduleRun();
