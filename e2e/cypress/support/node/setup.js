const path = require("path");
const {
  prepareDatabaseForSpec,
  teardownDatabaseForSpec,
  cleanupAll,
  reseedCurrentDatabase,
  getActiveDatabase,
  specKey,
  backupActiveDatabase,
} = require("./testDbLifecycle");
const { startApi, stopApi } = require("./serverManager");

const createTestEnvironment = (on, config) => {
  let currentSpecKey = null;

  const bootSpec = async (spec) => {
    const key = specKey(spec);
    if (currentSpecKey === key) {
      return;
    }

    const context = await prepareDatabaseForSpec(spec);

    try {
      await startApi(context.databaseUrl);
    } catch (error) {
      await teardownDatabaseForSpec(spec);
      throw error;
    }

    currentSpecKey = key;
  };

  on("before:run", async (details) => {
    const firstSpec = details?.specs?.[0];
    if (!firstSpec) {
      return;
    }

    await bootSpec(firstSpec);
  });

  on("before:spec", async (spec) => {
    await bootSpec(spec);
  });

  on("after:spec", async (spec, results) => {
    await stopApi();
    await teardownDatabaseForSpec(spec);
    if (currentSpecKey === specKey(spec)) {
      currentSpecKey = null;
    }

    if (results?.video) {
      const relativePath = path.relative(process.cwd(), results.video);
      console.log(`Cypress recorded ${spec.name}: ${relativePath}`);
    }
  });

  on("after:run", async () => {
    await stopApi();
    await cleanupAll();
    currentSpecKey = null;
  });

  on("task", {
    "db:reseed": async () => {
      const result = await reseedCurrentDatabase(currentSpecKey);
      if (!result.success) {
        throw new Error(result.message);
      }
      return true;
    },
    "db:active": () => getActiveDatabase(currentSpecKey),
    "db:backup": async (options) => {
      const targetName =
        typeof options === "string" ? options : options && options.name;
      const result = await backupActiveDatabase(currentSpecKey, targetName);
      if (!result.success) {
        throw new Error(result.message);
      }
      return result.fileName;
    },
  });

  return config;
};

module.exports = {
  createTestEnvironment,
};
