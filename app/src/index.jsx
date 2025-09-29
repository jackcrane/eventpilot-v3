import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "../hooks";
import { TourManager } from "../components/tourManager/TourManager";
import * as Sentry from "@sentry/react";
Sentry.init({
  dsn: "https://8b9364d81e09d51ae87ad1f28a9ea8ce@o1104565.ingest.us.sentry.io/4510103374200832",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <TourManager>
      <App />
    </TourManager>
  </AuthProvider>
);
