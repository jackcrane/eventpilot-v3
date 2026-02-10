import { defineConfig } from "cypress";
import {
  yamlPreprocessor,
  registerCommand,
  generateJsonSchema,
} from "cypress-yaml-plugin";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import pg from "pg";
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

registerCommand(
  "sql",
  (query) => {
    return [`cy.task('sql', ${JSON.stringify(query)})`];
  },
  {
    schema: z.string().min(1),
  },
);

generateJsonSchema();

function sanitizeDbUrlForPsql(dbUrl) {
  try {
    const url = new URL(dbUrl);
    let mutated = false;

    if (url.searchParams.has("schema")) {
      url.searchParams.delete("schema");
      mutated = true;
    }

    return mutated ? url.toString() : dbUrl;
  } catch (error) {
    return dbUrl;
  }
}

function runPsql(dbUrl, args) {
  const sanitizedDbUrl = sanitizeDbUrlForPsql(dbUrl);
  const result = spawnSync("psql", [sanitizedDbUrl, ...args], {
    stdio: "ignore",
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`psql command failed with exit code ${result.status}`);
  }
}

function runPrismaMigrate(dbUrl) {
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: dbUrl },
    cwd: path.resolve(process.cwd(), "web-api"),
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error("Prisma migrate deploy failed");
  }
}

function resolveSqlPath(relativePath) {
  if (!relativePath || typeof relativePath !== "string") {
    throw new Error(
      "db:seed expects the relative path to a SQL file, e.g. fixtures/account.sql",
    );
  }

  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }

  return path.resolve(process.cwd(), "cypress", relativePath);
}

const dumpDb = (label) => {
  const outDir = path.resolve("cypress/artifacts/db-dumps");
  fs.mkdirSync(outDir, { recursive: true });

  const filename = `${Date.now()}-${label}.sql`;
  const outPath = path.join(outDir, filename);

  const result = spawnSync(
    "pg_dump",
    [
      process.env.DATABASE_URL.replace("?schema=public", ""),
      "--no-owner",
      "--no-privileges",
    ],
    {
      stdio: ["ignore", fs.openSync(outPath, "w"), "inherit"],
      env: process.env,
    },
  );

  if (result.status !== 0) {
    throw new Error("pg_dump failed");
  }
};

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    video: true,
    screenshotsFolder: "cypress/screenshots",
    downloadsFolder: "cypress/downloads",
    retries: {
      runMode: 1,
      openMode: 0,
    },
    viewportWidth: 1280,
    viewportHeight: 800,
    chromeWebSecurity: false,
    defaultCommandTimeout: 8000,
    requestTimeout: 8000,
    responseTimeout: 8000,
    supportFile: false,
    async setupNodeEvents(on) {
      await client.connect();

      yamlPreprocessor(on);
      const resolvedBaseUrl = config?.baseUrl || DEFAULT_BASE_URL;

      on("task", {
        authenticateUser: async ({ username, password }) => {
          // TODO: Implement
        },

        "db:seed": (relativeSqlPath) => {
          const dbUrl = process.env.DATABASE_URL;

          if (!dbUrl) {
            throw new Error(
              "DATABASE_URL env variable must be set for db:seed",
            );
          }

          if (!dbUrl.includes("localhost")) {
            console.error(
              "DATABASE_URL must point to localhost; refusing to seed remote database",
            );
            process.exit(1);
          }

          const sqlFilePath = resolveSqlPath(relativeSqlPath);

          if (!fs.existsSync(sqlFilePath)) {
            throw new Error(`SQL file not found: ${sqlFilePath}`);
          }

          runPsql(dbUrl, ["-c", "DROP SCHEMA IF EXISTS public CASCADE"]);
          runPsql(dbUrl, ["-c", "CREATE SCHEMA public"]);
          runPrismaMigrate(dbUrl);
          runPsql(dbUrl, ["-f", sqlFilePath]);

          return null;
        },
      });
    },
    specPattern: "cypress/specs/**/*.yaml",
  },
});
