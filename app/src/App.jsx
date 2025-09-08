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
import { EventVolunteers } from "./routes/events/[eventId]/volunteers";
import { EventVolRegBuilder } from "./routes/events/[eventId]/builder";
import { Consumer } from "./consumer/Consumer";
import { useReducedSubdomain } from "../hooks/useReducedSubdomain";
import { EventJobs } from "./routes/events/[eventId]/jobs";
import { Home } from "./home";
import { EventSettings } from "./routes/events/[eventId]/settings";
import { EventSettingsBasicsPage } from "./routes/events/[eventId]/settings/basics";
import { EventSettingsContactPage } from "./routes/events/[eventId]/settings/contact";
import { EventSettingsSocialsPage } from "./routes/events/[eventId]/settings/socials";
import { EventSettingsConnectionsPage } from "./routes/events/[eventId]/settings/connections";
import { EventSettingsBillingPage } from "./routes/events/[eventId]/settings/billing";
import { EventCrm } from "./routes/events/[eventId]/crm";
import { CrmPersonPage } from "./routes/events/[eventId]/crm/[personId]";
import { EmailPage } from "./routes/email/[emailId]";
import { Conversations } from "./routes/events/[eventId]/conversations";
import { NewEventPage } from "./routes/events/new";
import { RegistrationBuilder } from "./routes/events/[eventId]/registration/builder";
import { FinancialsPage } from "./routes/events/[eventId]/financials";
import { RegistrationFormBuilderPage } from "./routes/events/[eventId]/registration/forms";
import { UpsellsPage } from "./routes/events/[eventId]/registration/upsells";
import { TeamsPage } from "./routes/events/[eventId]/registration/teams";
import { CouponsPage } from "./routes/events/[eventId]/registration/coupons";
import { RegistrationsPage } from "./routes/events/[eventId]/registration/registrations";
import { SelectedInstanceProvider } from "../contexts/SelectedInstanceContext";
import { EventSessionPage } from "./routes/events/[eventId]/session/[sessionId]";
import { EventTodosPage } from "./routes/events/[eventId]/todos";
const useNewConversationPage = true;

export default () => {
  const { loggedIn, loading, login, user } = useAuth();
  const location = useLocation();
  useFavicon(favicon);
  const subdomain = useReducedSubdomain();

  if (loading) return null;

  if (subdomain && subdomain !== "geteventpilot" && subdomain !== "localhost") {
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

      <SelectedInstanceProvider>
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

            <Route path="/email/:emailId" element={<EmailPage />} />

            <Route path="/events/new" element={<NewEventPage />} />

            <Route path="/events/:eventId" element={<Event />} />
            <Route path="/events" element={<Events />} />

            <Route path="/events/:eventId/todos" element={<EventTodosPage />} />

            <Route
              path="/events/:eventId/session/:sessionId"
              element={<EventSessionPage />}
            />

            <Route
              path="/events/:eventId/financials"
              element={<FinancialsPage />}
            />

            <Route
              path="/events/:eventId/volunteers"
              element={<EventVolunteers />}
            />
            <Route
              path="/events/:eventId/volunteers/builder"
              element={<EventVolRegBuilder />}
            />
            <Route
              path="/events/:eventId/volunteers/jobs"
              element={<EventJobs />}
            />

            <Route
              path="/events/:eventId/registration/builder"
              element={<RegistrationBuilder />}
            />
            <Route
              path="/events/:eventId/registration/form-builder"
              element={<RegistrationFormBuilderPage />}
            />
            <Route
              path="/events/:eventId/registration/upsells"
              element={<UpsellsPage />}
            />
            <Route
              path="/events/:eventId/registration/coupons"
              element={<CouponsPage />}
            />
            <Route
              path="/events/:eventId/registration/teams"
              element={<TeamsPage />}
            />
            <Route
              path="/events/:eventId/registration/registrations"
              element={<RegistrationsPage />}
            />

            <Route
              path="/events/:eventId/settings"
              element={<EventSettings />}
            />
            <Route
              path="/events/:eventId/settings/basics"
              element={<EventSettingsBasicsPage />}
            />
            <Route
              path="/events/:eventId/settings/contact"
              element={<EventSettingsContactPage />}
            />
            <Route
              path="/events/:eventId/settings/socials"
              element={<EventSettingsSocialsPage />}
            />
            <Route
              path="/events/:eventId/settings/connections"
              element={<EventSettingsConnectionsPage />}
            />
            <Route
              path="/events/:eventId/settings/billing"
              element={<EventSettingsBillingPage />}
            />
            <Route path="/events/:eventId/crm" element={<EventCrm />} />
            <Route
              path="/events/:eventId/crm/:personId"
              element={<CrmPersonPage />}
            />

            <Route
              path="/events/:eventId/conversations"
              element={<Conversations />}
            />
            <Route
              path="/events/:eventId/conversations/:threadId"
              element={<Conversations />}
            />
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
      </SelectedInstanceProvider>
    </div>
  );
};
