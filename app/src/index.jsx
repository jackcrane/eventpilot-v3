import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "../hooks";
import { TourManager } from "../components/tourManager/TourManager";
import { PostHogProvider } from "@posthog/react";
import * as Sentry from "@sentry/react";
import { posthogApiKey, posthogEnabled, posthogOptions } from "../util/posthog";

Sentry.init({
  dsn: "https://8b9364d81e09d51ae87ad1f28a9ea8ce@o1104565.ingest.us.sentry.io/4510103374200832",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});

const app = (
  <AuthProvider>
    <TourManager>
      <App />
    </TourManager>
  </AuthProvider>
);

createRoot(document.getElementById("root")).render(
  posthogEnabled ? (
    <PostHogProvider apiKey={posthogApiKey} options={posthogOptions}>
      {app}
    </PostHogProvider>
  ) : (
    app
  )
);
