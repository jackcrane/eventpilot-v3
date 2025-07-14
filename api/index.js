import express from "express";
import cors from "cors";
import path from "path";
import registerRoutes from "./util/router.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// SLow down requests
// app.use(async (req, res, next) => {
//   await new Promise((resolve) => setTimeout(resolve, 300));
//   next();
// });

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

const PORT = process.env.PORT || 3000;
let server;

if (process.env.NODE_ENV !== "test") {
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app, server };
