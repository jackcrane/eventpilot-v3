import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "../hooks";
import { TourManager } from "../components/tourManager/TourManager";
import { SelectedInstanceProvider } from "../contexts/SelectedInstanceContext";

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <TourManager>
      <App />
    </TourManager>
  </AuthProvider>
);
