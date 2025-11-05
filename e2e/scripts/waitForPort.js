const net = require("net");

const host = process.env.API_HOST || "127.0.0.1";
const port = Number(process.env.API_PORT || 3000);
const timeout = Number(process.env.API_START_TIMEOUT_MS || 60000);

const start = Date.now();

const attempt = () => {
  const socket = net.createConnection({ host, port }, () => {
    socket.end();
    process.exit(0);
  });

  socket.on("error", () => {
    socket.destroy();
    if (Date.now() - start >= timeout) {
      console.error(`Timed out waiting for ${host}:${port}`);
      process.exit(1);
    }
    setTimeout(attempt, 250);
  });
};

attempt();

setTimeout(() => {
  console.error(`Timed out waiting for ${host}:${port}`);
  process.exit(1);
}, timeout + 1000);
