const { spawn } = require("child_process");
const path = require("path");

const DEFAULT_HOST = process.env.POSTGRES_HOST || "localhost";
const DEFAULT_PORT = process.env.POSTGRES_PORT || "5432";
const DEFAULT_USER = process.env.POSTGRES_USER || "postgres";
const DEFAULT_PASSWORD = process.env.POSTGRES_PASSWORD || "postgres";
const DEFAULT_DB = process.env.POSTGRES_DB || "postgres";

const pgEnv = {
  PGHOST: DEFAULT_HOST,
  PGPORT: String(DEFAULT_PORT),
  PGUSER: DEFAULT_USER,
  PGPASSWORD: DEFAULT_PASSWORD,
};

const runPgCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      env: { ...process.env, ...pgEnv, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (error) => {
      reject(error);
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(
          `${command} ${args.join(" ")} exited with code ${code}.\n${stderr || stdout}`
        );
        reject(error);
      }
    });
  });

const createDatabase = async (databaseName) => {
  const args = [
    "-v",
    "ON_ERROR_STOP=1",
    "-d",
    DEFAULT_DB,
    "-c",
    `CREATE DATABASE "${databaseName}";`,
  ];
  await runPgCommand("psql", args);
};

const terminateConnections = async (databaseName) => {
  const args = [
    "-v",
    "ON_ERROR_STOP=1",
    "-d",
    DEFAULT_DB,
    "-c",
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${databaseName}' AND pid <> pg_backend_pid();`,
  ];

  try {
    await runPgCommand("psql", args);
  } catch (error) {
    // Ignore failures when terminating sessions (database might not exist yet)
  }
};

const dropDatabase = async (databaseName) => {
  await terminateConnections(databaseName);

  const dropArgs = [
    "-v",
    "ON_ERROR_STOP=1",
    "-d",
    DEFAULT_DB,
    "-c",
    `DROP DATABASE IF EXISTS "${databaseName}";`,
  ];

  await runPgCommand("psql", dropArgs);
};

const resetDatabase = async (databaseName) => {
  await terminateConnections(databaseName);

  const statements = [
    "DROP SCHEMA IF EXISTS public CASCADE;",
    `CREATE SCHEMA public AUTHORIZATION "${DEFAULT_USER}";`,
    `GRANT ALL ON SCHEMA public TO "${DEFAULT_USER}";`,
    "GRANT ALL ON SCHEMA public TO public;",
  ];

  for (const statement of statements) {
    const args = [
      "-v",
      "ON_ERROR_STOP=1",
      "-d",
      databaseName,
      "-c",
      statement,
    ];

    await runPgCommand("psql", args);
  }
};

const restoreDatabase = async (databaseName, dumpFile) => {
  const resolvedDump = path.resolve(dumpFile);
  const ext = path.extname(resolvedDump).toLowerCase();

  if (ext === ".sql" || ext === ".psql" || ext === ".pgsql") {
    const args = [
      "-v",
      "ON_ERROR_STOP=1",
      "-d",
      databaseName,
      "-f",
      resolvedDump,
    ];
    await runPgCommand("psql", args, {
      env: {
        PGDATABASE: databaseName,
      },
    });
    return;
  }

  const args = [
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "-d",
    databaseName,
    resolvedDump,
  ];
  await runPgCommand("pg_restore", args, {
    env: {
      PGDATABASE: databaseName,
    },
  });
};

const runQuery = async (databaseName, sql) => {
  const args = [
    "-v",
    "ON_ERROR_STOP=1",
    "-d",
    databaseName,
    "-c",
    sql,
  ];
  const { stdout } = await runPgCommand("psql", args);
  return stdout;
};

const buildConnectionString = (databaseName) =>
  `postgres://${encodeURIComponent(DEFAULT_USER)}:${encodeURIComponent(
    DEFAULT_PASSWORD
  )}@${DEFAULT_HOST}:${DEFAULT_PORT}/${databaseName}`;

module.exports = {
  createDatabase,
  dropDatabase,
  restoreDatabase,
  runQuery,
  buildConnectionString,
  resetDatabase,
  terminateConnections,
};
