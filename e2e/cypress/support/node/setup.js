const {
  prepareDatabaseForSpec,
  teardownDatabaseForSpec,
  cleanupAll,
  reseedCurrentDatabase,
  getActiveDatabase,
  specKey,
} = require("./testDbLifecycle");
const { startApi, stopApi } = require("./serverManager");

const createTestEnvironment = (on, config) => {
  let currentSpecKey = null;

  on("before:spec", async (spec) => {
    const key = specKey(spec);
    const context = await prepareDatabaseForSpec(spec);

    try {
      await startApi(context.databaseUrl);
    } catch (error) {
      await teardownDatabaseForSpec(spec);
      throw error;
    }

    currentSpecKey = key;
  });

  on("after:spec", async (spec) => {
    await stopApi();
    await teardownDatabaseForSpec(spec);
    if (currentSpecKey === specKey(spec)) {
      currentSpecKey = null;
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
  });

  return config;
};

module.exports = {
  createTestEnvironment,
};
