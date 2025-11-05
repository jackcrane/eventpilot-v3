// cypress.config.js
const path = require("path");
const { createTestEnvironment } = require("./cypress/support/node/setup");

const baseUrl =
  process.env.CYPRESS_BASE_URL || "http://geteventpilot.local:3000";
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
      // keep your existing test env setup
      const cfg = createTestEnvironment(on, config);

      // force stable rendering flags in Docker
      on("before:browser:launch", (browser = {}, launchOptions) => {
        const isChromium = browser.family === "chromium";
        const isElectron = browser.name === "electron";

        if (isChromium) {
          launchOptions.args.push(
            "--disable-dev-shm-usage", // avoid tiny /dev/shm
            "--no-sandbox",
            "--disable-gpu",
            "--force-color-profile=srgb",
            "--window-size=1280,1000",
            "--disable-features=PaintHolding"
          );
        }
        if (isElectron) {
          launchOptions.preferences ??= {};
          launchOptions.preferences.fullscreen = false;
          launchOptions.preferences.width = 1280;
          launchOptions.preferences.height = 1000;
        }
        return launchOptions;
      });

      return cfg;
    },
  },
};
