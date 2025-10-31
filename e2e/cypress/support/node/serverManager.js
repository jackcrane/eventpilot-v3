const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const net = require("net");

const API_DIR = path.resolve(process.cwd(), "../api");
const API_PORT = Number(process.env.API_PORT || 3000);
const API_HOST = "127.0.0.1";
const API_START_TIMEOUT_MS = Number(
  process.env.API_START_TIMEOUT_MS || 30000
);

let apiProcess = null;

const ensureFrontendBuild = () => {
  const distPath = path.resolve(process.cwd(), "../app/dist");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `app/dist not found at ${distPath}. Run yarn --cwd app build before running E2E tests.`
    );
  }
};

const waitForPort = (port, host, timeoutMs = 30000) =>
  new Promise((resolve, reject) => {
    const start = Date.now();

    const attempt = () => {
      const socket = net.createConnection({ port, host }, () => {
        socket.end();
        resolve();
      });

      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - start >= timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
        } else {
          setTimeout(attempt, 250);
        }
      });
    };

    attempt();
  });

const startApi = async (databaseUrl) => {
  await stopApi();
  ensureFrontendBuild();

  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      DATABASE_URL: databaseUrl,
      NODE_ENV: "test",
      PORT: String(API_PORT),
      E2E: "true",
    };

    const command = process.platform === "win32" ? "yarn.cmd" : "yarn";
    const args = ["start"];

    const child = spawn(command, args, {
      cwd: API_DIR,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let completed = false;
    const startupLogs = [];
    const pushLog = (source, data) => {
      const text = data.toString();
      startupLogs.push(`[${source}] ${text}`);
      // Keep only the most recent 200 entries to avoid runaway buffers.
      if (startupLogs.length > 200) {
        startupLogs.splice(0, startupLogs.length - 200);
      }
      const stream = source === "stdout" ? process.stdout : process.stderr;
      stream.write(`[api] ${text}`);
    };

    const onReady = () => {
      if (!completed) {
        completed = true;
        apiProcess = child;
        resolve();
      }
    };

    child.stdout.on("data", (data) => {
      pushLog("stdout", data);
    });

    child.stderr.on("data", (data) => {
      pushLog("stderr", data);
    });

    child.on("error", (error) => {
      if (!completed) {
        completed = true;
        reject(error);
      }
    });

    child.on("exit", (code, signal) => {
      apiProcess = null;
      if (!completed) {
        const message = code !== null ? `exited with code ${code}` : `exited via ${signal}`;
        const logDump = startupLogs.join("");
        completed = true;
        reject(
          new Error(
            `API process ${message}.${logDump ? `\nRecent API output:\n${logDump}` : ""}`
          )
        );
      }
    });

    waitForPort(API_PORT, API_HOST, API_START_TIMEOUT_MS)
      .then(onReady)
      .catch((error) => {
        if (!completed) {
          completed = true;
          apiProcess = child;
          const logDump = startupLogs.join("");
          reject(
            new Error(
              `Timed out waiting for ${API_HOST}:${API_PORT}.\n` +
                (logDump ? `Recent API output:\n${logDump}` : "No API output captured yet.") +
                `\nAPI process (pid ${child.pid}) left running for manual inspection.`
            )
          );
        }
      });
  });
};

const stopApi = async () => {
  if (!apiProcess) {
    return;
  }

  await new Promise((resolve) => {
    const current = apiProcess;
    const timeout = setTimeout(() => {
      current.kill("SIGKILL");
    }, 10000);

    current.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });

    current.kill("SIGTERM");
  });

  apiProcess = null;
};

module.exports = {
  startApi,
  stopApi,
};
