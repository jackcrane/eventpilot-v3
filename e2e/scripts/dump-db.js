#!/usr/bin/env node
// Dump DATA ONLY for all NON-EMPTY user tables (excluding Prisma migrations) to one SQL file.
// Usage:
//   node e2e/scripts/dump-db.js --url postgresql://user@host:5432/db --out e2e/cypress/fixtures/db/create-db.sql
// Notes:
//   • Requires `psql` and `pg_dump` on PATH.
//   • Fixes “no matching tables were found” by using -t <pattern> (short form) and exact identifier quoting.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// ---------- proc utils ----------
export const execChild = (cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, opts);
    let stdout = "";
    let stderr = "";
    if (child.stdout) child.stdout.on("data", (d) => (stdout += d.toString()));
    if (child.stderr) child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited with code ${code}\n${stderr}`));
    });
  });

// ---------- args ----------
export const parseArgs = () => {
  const out = { url: undefined, out: undefined };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const tok = argv[i];
    if (!tok.startsWith("--")) continue;
    const [flag, raw] = tok.split("=");
    const val = raw ?? argv[i + 1];
    if (!raw && val && val.startsWith("--")) continue;
    if (flag === "--url") {
      out.url = val;
      if (!raw) i += 1;
    } else if (flag === "--out") {
      out.out = val;
      if (!raw) i += 1;
    }
  }
  return out;
};

export const ensureArgs = ({ url, out }) => {
  if (!url) {
    console.error("Missing --url (Postgres connection string).");
    process.exit(1);
  }
  if (!out) {
    console.error("Missing --out (destination path for SQL).");
    process.exit(1);
  }
  const outPath = path.resolve(process.cwd(), out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  return { url, outPath };
};

// ---------- quoting ----------
const qi = (s) => `"${String(s).replace(/"/g, '""')}"`;

// ---------- discovery ----------
export const listUserTables = async (url) => {
  // Avoid system schemas; exclude Prisma migrations explicitly.
  const sql = `
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('pg_catalog','information_schema','pg_toast')
      AND NOT (table_schema = 'public' AND table_name = '_prisma_migrations')
    ORDER BY table_schema, table_name;
  `.trim();

  const { stdout } = await execChild("psql", [
    "--no-psqlrc",
    "--set",
    "ON_ERROR_STOP=1",
    "--tuples-only",
    "--no-align",
    `--dbname=${url}`,
    "--field-separator=|",
    "--command",
    sql,
  ]);

  return stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [schema, name] = l.split("|");
      return { schema, name };
    });
};

export const tableHasRows = async (url, schema, name) => {
  const sql = `SELECT EXISTS (SELECT 1 FROM ${qi(schema)}.${qi(
    name
  )} LIMIT 1);`;
  const { stdout } = await execChild("psql", [
    "--no-psqlrc",
    "--set",
    "ON_ERROR_STOP=1",
    "--tuples-only",
    "--no-align",
    `--dbname=${url}`,
    "--command",
    sql,
  ]);
  const v = stdout.trim();
  return v === "t" || v === "true" || v === "1";
};

export const getNonEmptyTables = async (url) => {
  const all = await listUserTables(url);
  const out = [];
  // modest concurrency
  let i = 0;
  const limit = Math.min(8, all.length || 1);
  const worker = async () => {
    while (i < all.length) {
      const idx = i++;
      const { schema, name } = all[idx];
      // eslint-disable-next-line no-await-in-loop
      if (await tableHasRows(url, schema, name)) out.push({ schema, name });
    }
  };
  await Promise.all(new Array(limit).fill(0).map(worker));
  // stable order
  out.sort((a, b) =>
    a.schema === b.schema
      ? a.name.localeCompare(b.name)
      : a.schema.localeCompare(b.schema)
  );
  return out;
};

// ---------- dump ----------
export const writeNote = (outPath, reason) => {
  const note = [
    "--",
    "-- No non-empty user tables found to dump data for.",
    `-- ${reason}`,
    `-- Generated at: ${new Date().toISOString()}`,
    "--",
    "",
  ].join("\n");
  fs.writeFileSync(outPath, note, "utf8");
};

export const dumpData = async (url, tables, outPath) => {
  // Use -t <pattern> (short form) and pass EXACT quoted identifiers: "schema"."table"
  const tableArgs = tables.flatMap(({ schema, name }) => [
    "-t",
    `${qi(schema)}.${qi(name)}`,
  ]);

  const args = [
    "-Fp",
    "--data-only",
    "--inserts",
    "--rows-per-insert=100",
    "--no-owner",
    "--no-privileges",
    "--file",
    outPath,
    `--dbname=${url}`,
    ...tableArgs,
  ];

  await execChild("pg_dump", args, { stdio: ["ignore", "pipe", "pipe"] });
};

// ---------- main ----------
export const run = async () => {
  const flags = parseArgs();
  const { url, outPath } = ensureArgs(flags);

  console.log(
    "▶️  Scanning for non-empty tables (excluding public._prisma_migrations) …"
  );
  const tables = await getNonEmptyTables(url);

  if (tables.length === 0) {
    writeNote(outPath, "All user tables are empty (or filtered).");
    console.log(`✅  Wrote note to ${outPath} (no data to dump).`);
    return;
  }

  // Debug print what we’ll dump (helps if pg_dump ever says “no matching tables” again)
  console.log(
    `▶️  Will dump ${tables.length} table(s): ${tables
      .map(({ schema, name }) => `${schema}.${name}`)
      .join(", ")}`
  );

  console.log(`▶️  Dumping DATA ONLY → ${outPath}`);
  await dumpData(url, tables, outPath);
  console.log(`✅  Data dump complete: ${outPath}`);
};

run().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
