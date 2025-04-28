import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "../hooks";

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
