import React, { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { useAuth } from "../hooks";
import { useFavicon, useLocation } from "react-use";
import favicon from "../assets/ico.png";
import { Consumer } from "./consumer/Consumer";
import { SelectedInstanceProvider } from "../contexts/SelectedInstanceContext";
import { useReducedSubdomain } from "../hooks/useReducedSubdomain";
import { AppSWRProvider } from "../contexts/AppSWRProvider";

/** Route components — dynamically imported for route-level code splitting */
const Page = React.lazy(() =>
  import("../components/page/Page").then((m) => ({ default: m.Page }))
);
const Home = React.lazy(() =>
  import("./home").then((m) => ({ default: m.Home }))
);
const WaitlistPage = React.lazy(() =>
  import("./routes/waitlist").then((m) => ({ default: m.WaitlistPage }))
);
const UnsubscribePage = React.lazy(() =>
  import("./routes/unsubscribe").then((m) => ({ default: m.UnsubscribePage }))
);
const Login = React.lazy(() =>
  import("./routes/auth/login").then((m) => ({ default: m.Login }))
);
const Register = React.lazy(() =>
  import("./routes/auth/register").then((m) => ({ default: m.Register }))
);
const ForgotPassword = React.lazy(() =>
  import("./routes/auth/forgot-password").then((m) => ({
    default: m.ForgotPassword,
  }))
);
const Verify = React.lazy(() =>
  import("./routes/auth/verify").then((m) => ({ default: m.Verify }))
);
const UserProfile = React.lazy(() =>
  import("./routes/auth/me").then((m) => ({ default: m.UserProfile }))
);

const EmailPage = React.lazy(() =>
  import("./routes/email/[emailId]").then((m) => ({ default: m.EmailPage }))
);

const NewEventPage = React.lazy(() =>
  import("./routes/events/new").then((m) => ({ default: m.NewEventPage }))
);
const Events = React.lazy(() =>
  import("./routes/events/Events").then((m) => ({ default: m.Events }))
);
const Event = React.lazy(() =>
  import("./routes/events/[eventId]").then((m) => ({ default: m.Event }))
);

const EventTodosPage = React.lazy(() =>
  import("./routes/events/[eventId]/todos").then((m) => ({
    default: m.EventTodosPage,
  }))
);
const EventSessionPage = React.lazy(() =>
  import("./routes/events/[eventId]/session/[sessionId]").then((m) => ({
    default: m.EventSessionPage,
  }))
);
const FinancialsPage = React.lazy(() =>
  import("./routes/events/[eventId]/financials").then((m) => ({
    default: m.FinancialsPage,
  }))
);

const EventVolunteers = React.lazy(() =>
  import("./routes/events/[eventId]/volunteers").then((m) => ({
    default: m.EventVolunteers,
  }))
);
const EventVolRegBuilder = React.lazy(() =>
  import("./routes/events/[eventId]/builder").then((m) => ({
    default: m.EventVolRegBuilder,
  }))
);
const EventJobs = React.lazy(() =>
  import("./routes/events/[eventId]/jobs").then((m) => ({
    default: m.EventJobs,
  }))
);
const EventProvisionersPage = React.lazy(() =>
  import("./routes/events/[eventId]/day-of/provisioners").then((m) => ({
    default: m.EventProvisionersPage,
  }))
);

const RegistrationBuilder = React.lazy(() =>
  import("./routes/events/[eventId]/registration/builder").then((m) => ({
    default: m.RegistrationBuilder,
  }))
);
const RegistrationFormBuilderPage = React.lazy(() =>
  import("./routes/events/[eventId]/registration/forms").then((m) => ({
    default: m.RegistrationFormBuilderPage,
  }))
);
const UpsellsPage = React.lazy(() =>
  import("./routes/events/[eventId]/registration/upsells").then((m) => ({
    default: m.UpsellsPage,
  }))
);
const CouponsPage = React.lazy(() =>
  import("./routes/events/[eventId]/registration/coupons").then((m) => ({
    default: m.CouponsPage,
  }))
);
const TeamsPage = React.lazy(() =>
  import("./routes/events/[eventId]/registration/teams").then((m) => ({
    default: m.TeamsPage,
  }))
);
const RegistrationsPage = React.lazy(() =>
  import("./routes/events/[eventId]/registration/registrations").then((m) => ({
    default: m.RegistrationsPage,
  }))
);

const EventConversationsPage = React.lazy(() =>
  import("./routes/events/[eventId]/conversations").then((m) => ({
    default: m.EventConversationsPage,
  }))
);

const EventMailingListsPage = React.lazy(() =>
  import("./routes/events/[eventId]/email/lists/index").then((m) => ({
    default: m.EventMailingListsPage,
  }))
);
const EventMailingListMembersPage = React.lazy(() =>
  import("./routes/events/[eventId]/email/lists/[mailingListId]").then((m) => ({
    default: m.EventMailingListMembersPage,
  }))
);

const EventEmailTemplatesPage = React.lazy(() =>
  import("./routes/events/[eventId]/email/templates/index").then((m) => ({
    default: m.EventEmailTemplatesPage,
  }))
);
const EventEmailTemplateDetailPage = React.lazy(() =>
  import("./routes/events/[eventId]/email/templates/[templateId]").then(
    (m) => ({ default: m.EventEmailTemplateDetailPage })
  )
);
const EventEmailTemplateCreatePage = React.lazy(() =>
  import("./routes/events/[eventId]/email/templates/new").then((m) => ({
    default: m.EventEmailTemplateCreatePage,
  }))
);

const EventEmailCampaignsPage = React.lazy(() =>
  import("./routes/events/[eventId]/email/campaigns/index").then((m) => ({
    default: m.EventEmailCampaignsPage,
  }))
);
const EventEmailCampaignDetailPage = React.lazy(() =>
  import("./routes/events/[eventId]/email/campaigns/[campaignId]").then(
    (m) => ({ default: m.EventEmailCampaignDetailPage })
  )
);

const EventSettings = React.lazy(() =>
  import("./routes/events/[eventId]/settings").then((m) => ({
    default: m.EventSettings,
  }))
);
const EventSettingsBasicsPage = React.lazy(() =>
  import("./routes/events/[eventId]/settings/basics").then((m) => ({
    default: m.EventSettingsBasicsPage,
  }))
);
const EventSettingsContactPage = React.lazy(() =>
  import("./routes/events/[eventId]/settings/contact").then((m) => ({
    default: m.EventSettingsContactPage,
  }))
);
const EventSettingsSocialsPage = React.lazy(() =>
  import("./routes/events/[eventId]/settings/socials").then((m) => ({
    default: m.EventSettingsSocialsPage,
  }))
);
const EventSettingsConnectionsPage = React.lazy(() =>
  import("./routes/events/[eventId]/settings/connections").then((m) => ({
    default: m.EventSettingsConnectionsPage,
  }))
);
const EventSettingsBillingPage = React.lazy(() =>
  import("./routes/events/[eventId]/settings/billing").then((m) => ({
    default: m.EventSettingsBillingPage,
  }))
);

const EventCrm = React.lazy(() =>
  import("./routes/events/[eventId]/crm").then((m) => ({ default: m.EventCrm }))
);
const CrmPersonPage = React.lazy(() =>
  import("./routes/events/[eventId]/crm/[personId]").then((m) => ({
    default: m.CrmPersonPage,
  }))
);

/** Tiny loader to keep things minimal */
const Loader = () => (
  <div style={{ padding: 16, textAlign: "center" }}>Loading…</div>
);

export default () => {
  const { loggedIn, loading, user } = useAuth();
  const location = useLocation(); // retained intentionally
  useFavicon(favicon);
  const subdomain = useReducedSubdomain();

  if (loading) return null;

  if (subdomain && subdomain !== "geteventpilot" && subdomain !== "localhost") {
    // Non-route surface; keep static for a surgical change. Wrap with Suspense just in case.
    return (
      <Suspense fallback={<Loader />}>
        <Consumer subdomain={subdomain} />
      </Suspense>
    );
  }

  if (user && user.suspended) {
    return (
      <div>
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
        <AppSWRProvider>
          <Router>
            <Suspense fallback={<Loader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/waitlist" element={<WaitlistPage />} />
                <Route path="/unsubscribe" element={<UnsubscribePage />} />

                {loggedIn ? (
                  <>
                    <Route path="/me" element={<UserProfile />} />
                  </>
                ) : (
                  <>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                      path="/forgot-password"
                      element={<ForgotPassword />}
                    />
                  </>
                )}
                <Route path="/verify" element={<Verify />} />

                <Route path="/email/:emailId" element={<EmailPage />} />

                <Route path="/events/new" element={<NewEventPage />} />

                <Route path="/events/:eventId" element={<Event />} />
                <Route path="/events" element={<Events />} />

                <Route
                  path="/events/:eventId/todos"
                  element={<EventTodosPage />}
                />

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
                  path="/events/:eventId/day-of/provisioners"
                  element={<EventProvisionersPage />}
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
                  path="/events/:eventId/conversations/:threadId"
                  element={<EventConversationsPage />}
                />
                <Route
                  path="/events/:eventId/conversations"
                  element={<EventConversationsPage />}
                />

                <Route
                  path="/events/:eventId/email/lists"
                  element={<EventMailingListsPage />}
                />
                <Route
                  path="/events/:eventId/email/lists/:mailingListId"
                  element={<EventMailingListMembersPage />}
                />

                <Route
                  path="/events/:eventId/email/templates"
                  element={<EventEmailTemplatesPage />}
                />
                <Route
                  path="/events/:eventId/email/templates/new"
                  element={<EventEmailTemplateCreatePage />}
                />
                <Route
                  path="/events/:eventId/email/templates/:templateId"
                  element={<EventEmailTemplateDetailPage />}
                />

                <Route
                  path="/events/:eventId/email/campaigns"
                  element={<EventEmailCampaignsPage />}
                />
                <Route
                  path="/events/:eventId/email/campaigns/:campaignId"
                  element={<EventEmailCampaignDetailPage />}
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

                {/* 404 */}
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
            </Suspense>
          </Router>
        </AppSWRProvider>
      </SelectedInstanceProvider>
    </div>
  );
};
