import { defineConfig } from "cypress";
import {
  yamlPreprocessor,
  registerCommand,
  generateJsonSchema,
} from "cypress-yaml-plugin";
import Stripe from "../api/node_modules/stripe/esm/stripe.esm.node.js";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import pg from "pg";
dotenv.config();
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});
import { z } from "zod";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_BILLING_ASSERTION_TIMEOUT_MS = 20000;
const DEFAULT_BILLING_ASSERTION_INTERVAL_MS = 1000;
let stripeClient = null;

registerCommand("sql", (query) => {
  return [`cy.task('sql', ${JSON.stringify(query)})`];
});

registerCommand(
  "authenticateUser",
  (options) => {
    const encodedOptions = JSON.stringify(options);
    const emailLabel = JSON.stringify(options.email);

    return [
      `cy.task('authenticateUser', ${encodedOptions}).then((token) => {
        if (!token) {
          throw new Error('authenticateUser task returned invalid token');
        }

        cy.window().then((win) => {
          win.localStorage.setItem('token', token);
        });

        cy.log('Authenticated as ' + ${emailLabel});
      });`,
    ];
  },
  {
    schema: z.object({
      email: z.string().min(1, "email is required"),
      password: z.string().min(1, "password is required"),
    }),
  },
);

registerCommand(
  "assertEventChargedAmount",
  ({ slug, amount, timeoutMs, intervalMs }) => {
    const encodedOptions = JSON.stringify({
      slug,
      amount,
      ...(timeoutMs ? { timeoutMs } : {}),
      ...(intervalMs ? { intervalMs } : {}),
    });
    const expectedAmountCents = Math.round(amount * 100);

    return [
      `cy.task('billing:assertEventChargedAmount', ${encodedOptions}).then((actualAmountCents) => {`,
      `  expect(actualAmountCents).to.equal(${expectedAmountCents});`,
      `});`,
    ];
  },
  {
    schema: z.object({
      slug: z.string().min(1, "slug is required"),
      amount: z.number().nonnegative("amount must be non-negative"),
      timeoutMs: z.number().int().positive().optional(),
      intervalMs: z.number().int().positive().optional(),
    }),
  },
);

registerCommand(
  "fillStripeElementsInput",
  ({ field, value }) => {
    return [
      `cy.get('iframe[name^="__privateStripeFrame"]')`,
      `  .its("0.contentDocument.body")`,
      `  .should("not.be.empty")`,
      `  .then(cy.wrap)`,
      `  .find(\`input[id="payment-${field}Input"]\`)`,
      `  .type(${value});`,
    ];
  },
  {
    schema: z.object({
      field: z.string(),
      value: z.string(),
    }),
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
  const repoRoot = path.resolve(process.cwd(), "..");
  const prismaBinName = process.platform === "win32" ? "prisma.cmd" : "prisma";
  const prismaPath = path.resolve(
    repoRoot,
    "api",
    "node_modules",
    ".bin",
    prismaBinName,
  );

  if (!fs.existsSync(prismaPath)) {
    throw new Error(
      `Prisma CLI not found at ${prismaPath}. Install api dependencies first.`,
    );
  }

  const result = spawnSync(prismaPath, ["migrate", "deploy"], {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: dbUrl },
    cwd: path.resolve(repoRoot, "api"),
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function authenticateAgainstBaseUrl(baseUrl, { email, password }) {
  if (!email || !password) {
    throw new Error(`authenticateUser requires both email and password`);
  }

  const loginUrl = new URL("/api/auth/login", baseUrl);
  const response = await fetch(loginUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    // handled below
  }

  if (!response.ok || !body?.token) {
    const statusText = response.statusText || "";
    throw new Error(
      `Failed to authenticate user ${email}: ${response.status} ${statusText}`.trim(),
    );
  }

  return body.token;
}

async function listPaidInvoiceTotalForEvent({ customerId, subscriptionId }) {
  if (!stripeClient) {
    const stripeSecretKey = process.env.STRIPE_SK;

    if (!stripeSecretKey) {
      throw new Error(
        "billing:assertEventChargedAmount requires STRIPE_SK in the Cypress environment",
      );
    }

    stripeClient = new Stripe(stripeSecretKey);
  }

  const invoices = await stripeClient.invoices.list({
    customer: customerId,
    ...(subscriptionId ? { subscription: subscriptionId } : {}),
    limit: 100,
  });

  return (invoices?.data || [])
    .filter((invoice) => invoice?.status === "paid")
    .reduce((sum, invoice) => sum + Number(invoice?.amount_paid || 0), 0);
}

async function assertSingleEventBySlug(slug) {
  const eventResult = await client.query(
    `
      SELECT e.id, e."stripe_customerId", e."stripe_subscriptionId"
      FROM "Event" e
      WHERE e.slug = $1
    `,
    [slug],
  );

  if (eventResult.rowCount !== 1) {
    throw new Error(
      `Expected to find 1 event with slug ${slug}, but found ${eventResult.rowCount}`,
    );
  }

  return eventResult.rows[0];
}

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
    async setupNodeEvents(on, config) {
      await client.connect();

      yamlPreprocessor(on);
      const resolvedBaseUrl = config?.baseUrl || DEFAULT_BASE_URL;

      on("task", {
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

        authenticateUser: async ({ email, password }) => {
          return authenticateAgainstBaseUrl(resolvedBaseUrl, {
            email,
            password,
          });
        },

        "billing:assertEventChargedAmount": async ({
          slug,
          amount,
          timeoutMs = DEFAULT_BILLING_ASSERTION_TIMEOUT_MS,
          intervalMs = DEFAULT_BILLING_ASSERTION_INTERVAL_MS,
        }) => {
          if (!slug) {
            throw new Error(`assertEventChargedAmount requires a slug`);
          }

          const expectedAmountCents = Math.round(Number(amount) * 100);
          if (!Number.isFinite(expectedAmountCents)) {
            throw new Error(
              `assertEventChargedAmount requires a numeric amount`,
            );
          }

          const deadline = Date.now() + timeoutMs;
          let lastObservedAmountCents = null;

          while (Date.now() <= deadline) {
            const event = await assertSingleEventBySlug(slug);

            if (!event.stripe_customerId) {
              throw new Error(
                `Event ${slug} does not have a stripe_customerId yet`,
              );
            }

            lastObservedAmountCents = await listPaidInvoiceTotalForEvent({
              customerId: event.stripe_customerId,
              subscriptionId: event.stripe_subscriptionId || null,
            });

            if (lastObservedAmountCents === expectedAmountCents) {
              return lastObservedAmountCents;
            }

            await sleep(intervalMs);
          }

          throw new Error(
            `Expected paid invoice total of ${expectedAmountCents} cents for event ${slug}, but observed ${lastObservedAmountCents ?? "no amount"} cents.`,
          );
        },
      });
    },
    specPattern: "cypress/specs/**/*.yaml",
  },
});
