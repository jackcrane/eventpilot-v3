#!/usr/bin/env node

/**
 * Generates Cypress spec files from Maestro-style YAML descriptors.
 * Each YAML file inside e2e/specs becomes a .cy.js file under
 * e2e/cypress/e2e/generated. The generator runs automatically via the
 * package.json precypress scripts.
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = path.join(__dirname, "..");
const SPECS_DIR = path.join(ROOT, "specs");
const OUTPUT_DIR = path.join(ROOT, "cypress", "e2e", "generated");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "yaml-manifest.json");
const FIXTURES_DIR = path.join(ROOT, "cypress", "fixtures", "db");

const SUPPORTED_EXTENSIONS = new Set([".yaml", ".yml"]);

const indent = (value, spaces = 4) =>
  value
    .split("\n")
    .map((line) => `${" ".repeat(spaces)}${line}`)
    .join("\n");

const ensureDirectories = () => {
  fs.mkdirSync(SPECS_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
};

const readSpecFiles = () => {
  ensureDirectories();
  return fs
    .readdirSync(SPECS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .filter((entry) =>
      SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    )
    .map((entry) => path.join(SPECS_DIR, entry.name));
};

const resetOutputDirectory = () => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    return;
  }

  fs.readdirSync(OUTPUT_DIR).forEach((entry) => {
    if (entry.endsWith(".cy.js") || entry === path.basename(MANIFEST_PATH)) {
      fs.rmSync(path.join(OUTPUT_DIR, entry));
    }
  });
};

const stringify = (value) => JSON.stringify(value);

const toLocator = (params, { allowText = true } = {}) => {
  if (typeof params === "string") {
    return `cy.get(${stringify(params)})`;
  }

  if (!params || typeof params !== "object") {
    throw new Error("Expected a selector, text, or object definition");
  }

  if (params.dataCy) {
    return `cy.get(${stringify(`[data-cy="${params.dataCy}"]`)})`;
  }

  if (params.selector) {
    return `cy.get(${stringify(params.selector)})`;
  }

  if (Object.prototype.hasOwnProperty.call(params, "placeholder")) {
    if (typeof params.placeholder !== "string") {
      throw new Error(
        "The `placeholder` field must be a string when provided in a locator"
      );
    }
    return `cy.get(${stringify(`[placeholder*="${params.placeholder}"]`)})`;
  }

  if (allowText && params.text) {
    const options = params.exact === false ? "" : ", { matchCase: false }";
    return `cy.contains(${stringify(params.text)}${options})`;
  }

  throw new Error(
    "Unable to build locator. Expected one of selector, dataCy, or text."
  );
};

const generateOpen = (params) => {
  const target =
    typeof params === "string"
      ? params
      : params && typeof params === "object" && params.path
      ? params.path
      : null;

  if (!target) {
    throw new Error(
      "The `open` step requires a string path or { path } object"
    );
  }

  return `cy.visit(${stringify(target)});`;
};

const generateTapOn = (params) => {
  const locator = toLocator(params);
  return `${locator}.should('be.visible').click();`;
};

const generateTypeText = (params) => {
  if (!params || typeof params !== "object") {
    throw new Error("The `typeText` step requires an object definition");
  }

  const hasPlaceholder =
    params && Object.prototype.hasOwnProperty.call(params, "placeholder");

  if (hasPlaceholder && typeof params.placeholder !== "string") {
    throw new Error(
      "The `placeholder` field must be a string when provided in `typeText`"
    );
  }

  if (!params.selector && !params.dataCy && !hasPlaceholder) {
    throw new Error(
      "The `typeText` step requires a selector, dataCy, placeholder, or text target"
    );
  }

  if (typeof params.text !== "string") {
    throw new Error("The `typeText` step requires a string `text` field");
  }

  const locator = toLocator(params, { allowText: false });
  const lines = [`${locator}`];
  if (params.clear !== false) {
    lines.push(`  .clear()`);
  }
  lines.push(`  .type(${stringify(params.text)})`);
  if (params.submit) {
    lines.push(`  .type('{enter}')`);
  }

  return `${lines.join("\n")};`;
};

const generateAssertVisible = (params) => {
  const normalizedParams =
    typeof params === "string" ? { text: params, exact: true } : params;

  const { allowScroll, ...locatorParams } = normalizedParams || {};

  const locator = toLocator(locatorParams);
  const lines = [`${locator}`];

  if (allowScroll) {
    lines.push(`  .scrollIntoView({ block: 'nearest', inline: 'nearest' })`);
  }

  lines.push(`  .should('be.visible')`);

  return `${lines.join("\n")};`;
};

const generateAssertContains = (params) => {
  if (!params || typeof params !== "object") {
    throw new Error("The `assertContains` step requires an object definition");
  }

  const locator = toLocator(params, { allowText: false });

  if (typeof params.text !== "string") {
    throw new Error("The `assertContains` step requires a string `text` field");
  }

  return `${locator}.should('contain.text', ${stringify(params.text)});`;
};

const generateAssertText = (params) => {
  if (!params || typeof params !== "object") {
    throw new Error("The `assertText` step requires an object definition");
  }

  const locator = toLocator(params, { allowText: false });

  if (typeof params.text !== "string") {
    throw new Error("The `assertText` step requires a string `text` field");
  }

  return `${locator}.should('have.text', ${stringify(params.text)});`;
};

const generateWaitFor = (params) => {
  const duration =
    typeof params === "number"
      ? params
      : params && typeof params === "object" && typeof params.ms === "number"
      ? params.ms
      : params &&
        typeof params === "object" &&
        typeof params.seconds === "number"
      ? params.seconds * 1000
      : null;

  if (duration === null || Number.isNaN(duration)) {
    throw new Error(
      "The `waitFor` step requires a number of milliseconds or { ms | seconds }"
    );
  }

  return `cy.wait(${duration});`;
};

const generateExpectUrl = (params) => {
  if (typeof params === "string") {
    return `cy.url().should('include', ${stringify(params)});`;
  }

  if (!params || typeof params !== "object") {
    throw new Error("The `expectUrl` step requires a string or object payload");
  }

  if (typeof params.equals === "string") {
    return `cy.location('pathname').should('eq', ${stringify(params.equals)});`;
  }

  if (typeof params.includes === "string") {
    return `cy.url().should('include', ${stringify(params.includes)});`;
  }

  throw new Error(
    "The `expectUrl` step supports `equals` or `includes` string fields"
  );
};

const generateScrollIntoView = (params) => {
  const locator = toLocator(params);
  return `${locator}.scrollIntoView();`;
};

const generateSetViewport = (params) => {
  if (!params || typeof params !== "object") {
    throw new Error("The `setViewport` step requires an object definition");
  }

  const { width, height } = params;

  if (typeof width !== "number" || typeof height !== "number") {
    throw new Error(
      "The `setViewport` step requires numeric `width` and `height`"
    );
  }

  return `cy.viewport(${width}, ${height});`;
};

const generateLog = (params) => {
  const message =
    typeof params === "string"
      ? params
      : params &&
        typeof params === "object" &&
        typeof params.message === "string"
      ? params.message
      : null;

  if (!message) {
    throw new Error("The `log` step requires a message string");
  }

  return `cy.log(${stringify(message)});`;
};

const generatePause = () => "cy.pause();";

const generateSaveSnapshot = (params) => {
  let name = "page";

  if (typeof params === "string") {
    name = params;
  } else if (params && typeof params === "object") {
    if ("name" in params) {
      if (typeof params.name === "string" && params.name.trim().length > 0) {
        name = params.name.trim();
      } else {
        throw new Error(
          "The `saveSnapshot` step requires a non-empty string `name` value"
        );
      }
    }
  } else if (params !== undefined) {
    throw new Error(
      "The `saveSnapshot` step accepts a string or object with a `name` field"
    );
  }

  return `cy.savePageSnapshot(${stringify(name)});`;
};

const generateTakeScreenshot = (params) => {
  if (params === undefined || params === null) {
    return "cy.screenshot();";
  }

  if (typeof params === "string") {
    const trimmed = params.trim();
    if (!trimmed) {
      throw new Error(
        "The `takeScreenshot` step requires a non-empty string when provided"
      );
    }
    return `cy.screenshot(${stringify(trimmed)});`;
  }

  if (params && typeof params === "object") {
    const { name, options } = params;
    let call = "cy.screenshot(";
    const parts = [];

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        throw new Error(
          "The `takeScreenshot` step expects `name` to be a non-empty string"
        );
      }
      parts.push(stringify(name.trim()));
    } else if (options !== undefined) {
      parts.push("undefined");
    }

    if (options !== undefined) {
      if (
        typeof options !== "object" ||
        options === null ||
        Array.isArray(options)
      ) {
        throw new Error(
          "The `takeScreenshot` step expects `options` to be an object when provided"
        );
      }
      parts.push(stringify(options));
    }

    call += parts.join(", ");
    return `${call});`;
  }

  throw new Error(
    "The `takeScreenshot` step accepts no value, a string name, or an object with `name` and optional `options`"
  );
};

const generateAuthenticateUser = (params) => {
  let email = null;
  let password = "Password";

  if (typeof params === "string") {
    email = params;
  } else if (params && typeof params === "object") {
    if (typeof params.email === "string") {
      email = params.email;
    }
    if (typeof params.password === "string" && params.password.trim() !== "") {
      password = params.password;
    }
  }

  if (!email || typeof email !== "string" || !email.trim()) {
    throw new Error(
      "The `authenticateUser` step requires an email string (accepts either `authenticateUser: email` or `authenticateUser: { email }`)."
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  const requestStatement = [
    "cy.request({",
    "  method: 'POST',",
    "  url: '/api/auth/login',",
    `  body: { email: ${stringify(normalizedEmail)}, password: ${stringify(
      password
    )} },`,
    "  headers: { 'Content-Type': 'application/json' },",
    "}).then((response) => {",
    "  const token = response?.body?.token;",
    "  if (!token || typeof token !== 'string') {",
    "    throw new Error('authenticateUser: expected login response to include a token');",
    "  }",
    "  return cy.window().then((win) => {",
    "    win.localStorage.setItem('token', token);",
    "  });",
    "});",
  ];

  return requestStatement.join("\n");
};

const generateUploadFile = (params) => {
  if (!params || typeof params !== "object") {
    throw new Error("The `uploadFile` step expects an object definition");
  }

  const { file, options } = params;

  if (typeof file !== "string" || !file.trim()) {
    throw new Error("The `uploadFile` step requires a non-empty string `file`");
  }

  const locator = toLocator(params, { allowText: false });

  const normalizedFile = file.startsWith("cypress/fixtures/")
    ? file
    : path.posix.join("cypress", "fixtures", file);

  if (options !== undefined) {
    if (
      typeof options !== "object" ||
      options === null ||
      Array.isArray(options)
    ) {
      throw new Error(
        "The `uploadFile` step expects `options` to be an object when provided"
      );
    }

    return `${locator}.selectFile(${stringify(normalizedFile)}, ${stringify(
      options
    )});`;
  }

  return `${locator}.selectFile(${stringify(normalizedFile)});`;
};

const generateBackupDb = (params) => {
  let name = null;

  if (typeof params === "string") {
    name = params;
  } else if (params && typeof params === "object") {
    name = params.name;
  }

  if (typeof name !== "string" || !name.trim()) {
    throw new Error(
      "The `backupDb` step requires a non-empty string name (either `backupDb: name` or `backupDb: { name }`)."
    );
  }

  const normalizedName = name.trim();

  return `cy.task('db:backup', { name: ${stringify(normalizedName)} });`;
};

const STEP_GENERATORS = {
  open: generateOpen,
  tapOn: generateTapOn,
  typeText: generateTypeText,
  assertVisible: generateAssertVisible,
  assertContains: generateAssertContains,
  assertText: generateAssertText,
  waitFor: generateWaitFor,
  expectUrl: generateExpectUrl,
  scrollIntoView: generateScrollIntoView,
  setViewport: generateSetViewport,
  log: generateLog,
  pause: generatePause,
  saveSnapshot: generateSaveSnapshot,
  takeScreenshot: generateTakeScreenshot,
  authenticateUser: generateAuthenticateUser,
  uploadFile: generateUploadFile,
  backupDb: generateBackupDb,
};

const normalizeStep = (rawStep, index, fileName) => {
  if (typeof rawStep === "string") {
    return STEP_GENERATORS.log(rawStep);
  }

  if (!rawStep || typeof rawStep !== "object") {
    throw new Error(
      `Step ${index + 1} in ${fileName} must be a string or single-key object`
    );
  }

  const entries = Object.entries(rawStep);
  if (entries.length !== 1) {
    throw new Error(
      `Step ${index + 1} in ${fileName} should contain exactly one action`
    );
  }

  const [action, params] = entries[0];
  const handler = STEP_GENERATORS[action];

  if (!handler) {
    const available = Object.keys(STEP_GENERATORS).sort().join(", ");
    throw new Error(
      `Unknown action "${action}" in ${fileName}. Supported actions: ${available}`
    );
  }

  return handler(params);
};

const loadSpec = (filePath) => {
  const contents = fs.readFileSync(filePath, "utf8");

  let spec;
  try {
    spec = yaml.load(contents, { filename: filePath });
  } catch (error) {
    throw new Error(`Failed to parse ${filePath}: ${error.message}`);
  }

  if (!spec || typeof spec !== "object") {
    throw new Error(`${filePath} must contain a YAML object`);
  }

  if (!Array.isArray(spec.steps) || spec.steps.length === 0) {
    throw new Error(`${filePath} must define a non-empty steps array`);
  }

  if (typeof spec.seedFile !== "string" || !spec.seedFile.trim()) {
    throw new Error(`${filePath} must declare a non-empty seedFile string`);
  }

  const seedInput = spec.seedFile.trim();
  const candidatePaths = [
    path.isAbsolute(seedInput) ? seedInput : path.join(ROOT, seedInput),
    path.join(FIXTURES_DIR, seedInput),
  ];

  const seedFilePath = candidatePaths.find((candidate) =>
    fs.existsSync(candidate)
  );

  if (!seedFilePath) {
    throw new Error(
      `${filePath} seedFile "${seedInput}" not found. Use a path relative to e2e/ or cypress/fixtures/db/.`
    );
  }

  let skipValue = false;
  if (spec.skip !== undefined) {
    if (typeof spec.skip !== "boolean") {
      throw new Error(
        `${filePath} has an invalid skip value. Expected a boolean when provided.`
      );
    }
    skipValue = spec.skip;
  }

  return {
    skip: skipValue,
    seedFilePath,
    seedFileRelative: path
      .relative(ROOT, seedFilePath)
      .split(path.sep)
      .join("/"),
    name:
      typeof spec.name === "string" && spec.name.trim().length > 0
        ? spec.name.trim()
        : path.basename(filePath, path.extname(filePath)),
    description:
      typeof spec.description === "string" ? spec.description.trim() : null,
    steps: spec.steps,
  };
};

const generateTestContents = (spec, sourceName) => {
  const statements = spec.steps.map((step, index) =>
    normalizeStep(step, index, sourceName)
  );
  const sanitizedScreenshotName = `${spec.name.replace(/\s+/g, "-")}-final`;
  statements.push(`cy.screenshot(${JSON.stringify(sanitizedScreenshotName)});`);

  const testBody = statements.map((statement) => indent(statement)).join("\n");

  const descriptionComment = spec.description ? `// ${spec.description}\n` : "";

  const testLabel = JSON.stringify(`runs ${spec.name}`);

  return `// Auto-generated from ${sourceName}\n${descriptionComment}// Database seed: ${
    spec.seedFileRelative
  }\n\ndescribe(${JSON.stringify(
    spec.name
  )}, () => {\n  it(${testLabel}, () => {\n${testBody}\n  });\n});\n`;
};

const generateSpecs = () => {
  resetOutputDirectory();

  const specFiles = readSpecFiles();

  if (specFiles.length === 0) {
    console.log(
      "[generateYamlSpecs] No YAML specs found. Add files to e2e/specs/*.yaml"
    );
    return;
  }

  let generated = 0;
  const manifest = {};
  const specRoot = path.join(ROOT, "cypress", "e2e");

  for (const filePath of specFiles) {
    const spec = loadSpec(filePath);
    if (spec.skip) {
      console.log(
        `[generateYamlSpecs] Skipping ${path.basename(filePath)} (skip: true)`
      );
      continue;
    }
    const outputName = `${path.basename(
      filePath,
      path.extname(filePath)
    )}.cy.js`;
    const contents = generateTestContents(spec, path.basename(filePath));
    const outputAbsolute = path.join(OUTPUT_DIR, outputName);
    fs.writeFileSync(outputAbsolute, contents);

    const relativeSpecPath = path
      .relative(specRoot, outputAbsolute)
      .split(path.sep)
      .join("/");

    manifest[relativeSpecPath] = spec.seedFileRelative;
    generated += 1;
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(
    `[generateYamlSpecs] Generated ${generated} Cypress spec${
      generated === 1 ? "" : "s"
    } from YAML`
  );
};

const args = process.argv.slice(2);
// Support both --watch and -w
const watchMode = args.includes("--watch") || args.includes("-w");

const runGeneration = () => {
  try {
    generateSpecs();
  } catch (error) {
    console.error(`[generateYamlSpecs] ${error.message}`);
    process.exitCode = 1;
  }
};

if (!watchMode) {
  runGeneration();
  process.exit(process.exitCode ?? 0);
}

ensureDirectories();
runGeneration();
console.log("[generateYamlSpecs] Watching YAML specs for changes...");

let debounceTimer = null;
const scheduleRegeneration = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    runGeneration();
  }, 100);
};

fs.watch(SPECS_DIR, { persistent: true }, (_eventType, filename) => {
  if (!filename) {
    scheduleRegeneration();
    return;
  }

  const extension = path.extname(filename).toLowerCase();
  if (SUPPORTED_EXTENSIONS.has(extension)) {
    scheduleRegeneration();
  }
});
