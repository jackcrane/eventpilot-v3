const { createDatabase } = require("../cypress/support/node/dbManager");

const databaseName = process.env.API_DATABASE_NAME || "e2e_api";

const ensureDatabase = async () => {
  try {
    await createDatabase(databaseName);
  } catch (error) {
    if (!/already exists/i.test(error.message || "")) {
      console.error(
        `Failed to ensure database "${databaseName}" exists: ${error.message || error}`
      );
      process.exit(1);
    }
  }
};

ensureDatabase().catch((error) => {
  console.error(
    `Unexpected error while ensuring database "${databaseName}" exists: ${
      error.message || error
    }`
  );
  process.exit(1);
});
