import { Toaster } from "react-hot-toast";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { VolunteerRegistrationPage } from "./routes/volunteer";
import { RegisterPage } from "./routes/register";

export const Consumer = ({ subdomain }) => {
  return (
    <div>
      <Toaster />
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/register" replace />} />
          <Route path="/volunteer" element={<VolunteerRegistrationPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/register" replace />} />
        </Routes>
      </Router>
    </div>
  );
};
