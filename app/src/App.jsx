import React from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useAuth } from "../hooks";
import { Login } from "./routes/auth/login";
import { Header } from "../components/header/Header";
import { Page } from "../components/page/Page";
import { Event } from "./routes/events/[eventId]";
import { Register } from "./routes/auth/register";
import { Verify } from "./routes/auth/verify";
import { UserProfile } from "./routes/auth/me";
import { ForgotPassword } from "./routes/auth/forgot-password";
import { useFavicon, useLocation } from "react-use";
import favicon from "../assets/ico.png";
import { Events } from "./routes/events/Events";
import { Campaign } from "./routes/events/[eventId]/campaigns/[campaignId]";
import { CampaignVolunteers } from "./routes/events/[eventId]/campaigns/[campaignId]/volunteers";
import { CampaignBuilder } from "./routes/events/[eventId]/campaigns/[campaignId]/builder";
import { Consumer } from "./consumer/Consumer";
import { useReducedSubdomain } from "../hooks/useReducedSubdomain";
import { EventJobs } from "./routes/events/[eventId]/jobs";
import { EventCampaigns } from "./routes/events/[eventId]/campaigns";
import { Home } from "./home";

export default () => {
  const { loggedIn, loading, login, user } = useAuth();
  const location = useLocation();
  useFavicon(favicon);
  const subdomain = useReducedSubdomain();

  if (loading) return null;

  if (subdomain !== "eventpilot.com" && subdomain !== "localhost") {
    return <Consumer subdomain={subdomain} />;
  }

  if (user && user.suspended) {
    return (
      <div>
        {/* <Header /> */}
        <div style={{ padding: "20px" }}>
          <h1>Your account has been suspended</h1>
          <p>Please contact support@geteventpilot.com for assistance.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Toaster />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          {loggedIn ? (
            <>
              <Route path="/me" element={<UserProfile />} />
            </>
          ) : (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
            </>
          )}
          <Route path="/verify" element={<Verify />} />
          <Route path="/events/:eventId" element={<Event />} />
          <Route path="/events" element={<Events />} />
          <Route
            path="/events/:eventId/campaigns"
            element={<EventCampaigns />}
          />
          <Route
            path="/events/:eventId/campaigns/:campaignId"
            element={<Campaign />}
          />
          <Route
            path="/events/:eventId/campaigns/:campaignId/volunteers"
            element={<CampaignVolunteers />}
          />
          <Route
            path="/events/:eventId/campaigns/:campaignId/builder"
            element={<CampaignBuilder />}
          />
          <Route path="/events/:eventId/jobs" element={<EventJobs />} />
          {/* 404 error */}
          <Route
            path="*"
            element={
              <Page>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "70vh",
                  }}
                >
                  <h1>Error 404</h1>
                  <p>Page not found</p>
                </div>
              </Page>
            }
          />
        </Routes>
      </Router>
    </div>
  );
};
