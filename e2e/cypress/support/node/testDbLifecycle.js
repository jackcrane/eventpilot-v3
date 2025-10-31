const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  createDatabase,
  dropDatabase,
  restoreDatabase,
  buildConnectionString,
} = require("./dbManager");

const SPEC_ROOT = path.resolve(process.cwd(), "cypress/e2e");
const DUMP_ROOT = path.resolve(process.cwd(), "cypress/fixtures/db");

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

const resolveDumpPath = (spec) => {
  const absolute = spec.absolute || path.resolve(process.cwd(), spec.relative);
  const relative = path.relative(SPEC_ROOT, absolute);
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

    try {
      await restoreDatabase(databaseName, dumpPath);
    } catch (error) {
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
