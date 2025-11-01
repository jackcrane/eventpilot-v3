const path = require("path");
const { createTestEnvironment } = require("./cypress/support/node/setup");

const baseUrl = process.env.CYPRESS_BASE_URL || "http://127.0.0.1:3000";
const artifactsRoot = path.join("artifacts");

module.exports = {
  video: true,
  videosFolder: path.join(artifactsRoot, "videos"),
  screenshotsFolder: path.join(artifactsRoot, "screenshots"),
  retries: 0,
  screenshotOnRunFailure: true,
  chromeWebSecurity: false,
  e2e: {
    baseUrl,
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.js",
    setupNodeEvents(on, config) {
      return createTestEnvironment(on, config);
    },
  },
};
