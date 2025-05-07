import { Toaster } from "react-hot-toast";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Campaign } from "./routes/[campaignId]";

export const Consumer = ({ subdomain }) => {
  return (
    <div>
      <Toaster />
      <Router>
        <Routes>
          <Route path="/" element={<p>Subdomain: {subdomain}</p>} />

          <Route path="/c/:campaignSlug" element={<Campaign />} />
        </Routes>
      </Router>
    </div>
  );
};
