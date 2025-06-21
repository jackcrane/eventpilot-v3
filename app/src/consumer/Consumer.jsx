import { Toaster } from "react-hot-toast";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { EventRegistration } from "./routes/index";

export const Consumer = ({ subdomain }) => {
  return (
    <div>
      <Toaster />
      <Router>
        <Routes>
          <Route path="/" element={<EventRegistration />} />
        </Routes>
      </Router>
    </div>
  );
};
