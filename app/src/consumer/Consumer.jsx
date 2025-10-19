import { Toaster } from "react-hot-toast";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { VolunteerRegistrationPage } from "./routes/volunteer";
import { RegisterPage } from "./routes/register";
import { ConsumerWebsiteRoute } from "./routes/website";

export const Consumer = ({ subdomain }) => {
  return (
    <div>
      <Toaster />
      <Router>
        <Routes>
          <Route path="/volunteer" element={<VolunteerRegistrationPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={<ConsumerWebsiteRoute defaultRouteKey="home" />}
          />
          <Route path="/*" element={<ConsumerWebsiteRoute />} />
        </Routes>
      </Router>
    </div>
  );
};
