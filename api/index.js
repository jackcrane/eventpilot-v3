import "./otel/register.js";
import express from "express";
import cors from "cors";
import path from "path";
import * as Sentry from "@sentry/node";
import registerRoutes from "./util/router.js";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const sentryEnabled =
  process.env.NODE_ENV !== "test" && Boolean(process.env.SENTRY_DSN);

if (sentryEnabled) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    registerEsmLoaderHooks: {
      exclude: [/react-email\//],
    },
    maxValueLength: 2048,
  });
}

app.use(
  cors({
    // origin: "http://localhost:3152", // Allow requests from your React app
    // optionsSuccessStatus: 200,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "QUERY"],
  })
);

app.use((req, res, next) => {
  const charSet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  req.id = Array(12)
    .fill(null)
    .map(() => charSet.charAt(Math.floor(Math.random() * charSet.length)))
    .join("");

  if (sentryEnabled) {
    const scope = Sentry.getCurrentScope();
    scope?.setTag("request_id", req.id);
  }

  next();
});

app.use((req, res, next) => {
  const instance = req.headers["x-instance"] || req.headers["X-Instance"];
  if (instance) {
    req.instanceId = instance;
  }
  next();
});

app.use((req, res, next) => {
  if (process.env.NODE_ENV !== "test") {
    console.log(`[${req.id}][REQUEST]`, req.method, req.url);
  }
  next();
});

app.use(
  express.json({
    limit: "10mb",
  })
);
app.use(express.urlencoded({ limit: "10mb", extended: true }));

await registerRoutes(app, path.join(process.cwd(), "routes"));

app.use(express.static("../app/dist"));
app.use("/static", express.static(path.join(process.cwd(), "static")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../app/dist", "index.html"));
});

if (sentryEnabled) {
  Sentry.setupExpressErrorHandler(app);
}

app.use((err, req, res, next) => {
  console.error(`[${req?.id ?? "unknown"}][ERROR]`, err);
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: status === 500 ? "Internal Server Error" : err.message,
  });
});

const PORT = process.env.PORT || 3000;
let server;

if (process.env.NODE_ENV !== "test" || process.env.E2E) {
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app, server };
