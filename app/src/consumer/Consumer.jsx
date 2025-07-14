import { Toaster } from "react-hot-toast";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { ConsumerIndex } from "./routes";

export const Consumer = ({ subdomain }) => {
  return (
    <div>
      <Toaster />
      <Router>
        <Routes>
          <Route path="/volunteer" element={<ConsumerIndex />} />
        </Routes>
      </Router>
    </div>
  );
};
