const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  createDatabase,
  dropDatabase,
  restoreDatabase,
  buildConnectionString,
  resetDatabase,
} = require("./dbManager");

const SPEC_ROOT = path.resolve(process.cwd(), "cypress/e2e");
const DUMP_ROOT = path.resolve(process.cwd(), "cypress/fixtures/db");
const API_DIR = path.resolve(process.cwd(), "../api");
const GENERATED_MANIFEST_PATH = path.join(
  SPEC_ROOT,
  "generated",
  "yaml-manifest.json",
);

const activeSpecs = new Map();
const EXTERNAL_API_MANAGEMENT =
  String(process.env.API_MANAGED_EXTERNALLY || "").toLowerCase() === "true";
const EXTERNAL_DATABASE_NAME = process.env.API_DATABASE_NAME || "e2e_api";

const sanitizeDbName = (input) =>
  input
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

const specKey = (spec) => spec.relative || spec.name || spec.absolute;

let manifestCache = null;

const manifestForGeneratedSpecs = () => {
  if (manifestCache !== null) {
    return manifestCache;
  }

  if (!fs.existsSync(GENERATED_MANIFEST_PATH)) {
    manifestCache = {};
    return manifestCache;
  }

  try {
    const contents = fs.readFileSync(GENERATED_MANIFEST_PATH, "utf8");
    manifestCache = JSON.parse(contents);
  } catch (error) {
    throw new Error(
      `Unable to parse YAML manifest at ${GENERATED_MANIFEST_PATH}: ${
        error.message || error
      }`,
    );
  }

  return manifestCache;
};

const resolveDumpPath = (spec) => {
  const absolute = spec.absolute || path.resolve(process.cwd(), spec.relative);
  const relative = path.relative(SPEC_ROOT, absolute);
  const normalizedRelative = relative.split(path.sep).join("/");

  const manifest = manifestForGeneratedSpecs();
  const manifestEntry = manifest[normalizedRelative];
  if (manifestEntry) {
    return path.resolve(process.cwd(), manifestEntry);
  }

  const withoutExtension = relative.replace(/\.cy\.[^.]+$/, "");
  const sqlDump = path.join(DUMP_ROOT, `${withoutExtension}.sql`);
  if (fs.existsSync(sqlDump)) {
    return sqlDump;
  }
  const customDump = path.join(DUMP_ROOT, `${withoutExtension}.dump`);
  return customDump;
};

const ensureDumpExists = (dumpPath) => {
  if (!fs.existsSync(dumpPath)) {
    throw new Error(
      `Expected pg_dump file at ${dumpPath}. Use the db dumper utility to generate one.`
    );
  }
};

const runPrismaMigrateDeploy = async (databaseUrl) =>
  new Promise((resolve, reject) => {
    const command = process.platform === "win32" ? "yarn.cmd" : "yarn";
    const args = ["prisma", "migrate", "deploy"];

    const child = spawn(command, args, {
      cwd: API_DIR,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        NODE_ENV: "test",
        E2E: "true",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    child.stdout.on("data", (data) => {
      process.stdout.write(`[prisma migrate] ${data}`);
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
      process.stderr.write(`[prisma migrate] ${data}`);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `prisma migrate deploy exited with code ${code}${
              stderr ? `\n${stderr}` : ""
            }`
          )
        );
      }
    });
  });

const prepareDatabaseForSpec = async (spec) => {
  const key = specKey(spec);

  if (activeSpecs.has(key)) {
    return activeSpecs.get(key);
  }

  const dumpPath = resolveDumpPath(spec);
  ensureDumpExists(dumpPath);

  const relative = path.relative(SPEC_ROOT, spec.absolute || spec.relative);

  if (EXTERNAL_API_MANAGEMENT) {
    const databaseName = EXTERNAL_DATABASE_NAME;

    try {
      await createDatabase(databaseName);
    } catch (error) {
      if (!/already exists/i.test(error.message || "")) {
        throw new Error(
          `Failed to ensure database ${databaseName} for ${relative}: ${
            error.message || error
          }`
        );
      }
    }

    const databaseUrl = buildConnectionString(databaseName);

    try {
      await resetDatabase(databaseName);
      await runPrismaMigrateDeploy(databaseUrl);
    } catch (error) {
      throw new Error(
        `Failed to reset database ${databaseName} for ${relative}.\n${
          error.message || error
        }`
      );
    }

    try {
      await restoreDatabase(databaseName, dumpPath);
    } catch (error) {
      throw new Error(
        `Failed to seed database for ${relative}.\n${error.message}`
      );
    }

    const context = {
      key,
      databaseName,
      databaseUrl,
      dumpPath,
    };

    activeSpecs.set(key, context);
    return context;
  }

  const baseName = sanitizeDbName(relative.replace(/\.[^.]+$/, ""));
  const suffix = crypto.randomBytes(4).toString("hex");
  const databaseName = `e2e_${(baseName || "spec").slice(0, 40)}_${suffix}`.slice(0, 62);

  try {
    await createDatabase(databaseName);
  } catch (error) {
    throw new Error(
      `Failed to create database ${databaseName} for ${relative}: ${error.message}`
    );
  }

  try {
    await restoreDatabase(databaseName, dumpPath);
  } catch (error) {
    await dropDatabase(databaseName);
    throw new Error(
      `Failed to seed database for ${relative}.\n${error.message}`
    );
  }

  const databaseUrl = buildConnectionString(databaseName);
  const context = {
    key,
    databaseName,
    databaseUrl,
    dumpPath,
  };

  activeSpecs.set(key, context);
  return context;
};

const teardownDatabaseForSpec = async (spec) => {
  const key = specKey(spec);
  const context = activeSpecs.get(key);
  if (!context) {
    return;
  }

  if (!EXTERNAL_API_MANAGEMENT) {
    await dropDatabase(context.databaseName);
  }
  activeSpecs.delete(key);
};

const cleanupAll = async () => {
  const remaining = Array.from(activeSpecs.values());
  for (const context of remaining) {
    if (!EXTERNAL_API_MANAGEMENT) {
      await dropDatabase(context.databaseName);
    }
  }
  activeSpecs.clear();
};

const reseedCurrentDatabase = async (key) => {
  if (!key) {
    return {
      success: false,
      message: "Cannot reseed outside an active test run.",
    };
  }

  const context = activeSpecs.get(key);
  if (!context) {
    return {
      success: false,
      message: "No active database found for this spec.",
    };
  }

  try {
    await resetDatabase(context.databaseName);
    await runPrismaMigrateDeploy(context.databaseUrl);
    await restoreDatabase(context.databaseName, context.dumpPath);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: `Unable to reseed database. Ensure the dump matches the schema.\n${error.message}`,
    };
  }
};

const getActiveDatabase = (key) => {
  if (!key) {
    return { success: false };
  }
  const context = activeSpecs.get(key);
  if (!context) {
    return { success: false };
  }
  return {
    success: true,
    databaseUrl: context.databaseUrl,
    dumpPath: context.dumpPath,
  };
};

module.exports = {
  prepareDatabaseForSpec,
  teardownDatabaseForSpec,
  cleanupAll,
  reseedCurrentDatabase,
  getActiveDatabase,
  specKey,
};
