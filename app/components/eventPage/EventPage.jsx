import { Typography, Util, Button } from "tabler-react-2";
import { useParsedUrl } from "../../hooks/useParsedUrl";
import { Row } from "../../util/Flex";
import { useLocation, useParams } from "react-router-dom";
import { Page } from "../page/Page";
import { Icon } from "../../util/Icon";
import { useEvent } from "../../hooks/useEvent";
import { Loading } from "../loading/Loading";
import { Sidenav } from "../sidenav/Sidenav";
import { useConversations } from "../../hooks/useConversations";
import { useStripeExpress } from "../../hooks/useStripeExpress";

export const EventPage = ({
  children,
  title,
  tour,
  loading,
  description,
  docsLink,
}) => {
  const { eventId } = useParams();
  const { event, loading: eventLoading } = useEvent({ eventId });
  const { pathname } = useLocation();

  const {
    isNew,
    loginUrl,
    startOnboarding,
    loading: stripeLoading,
  } = useStripeExpress({ eventId });

  if (eventLoading)
    return (
      <Page title={title}>
        <Loading gradient={false} />
      </Page>
    );

  // helper to test exact match
  const isActive = (href) => pathname === href;

  const base = `/events/${eventId}`;
  const sidenavItems = [
    {
      type: "item",
      href: "/events",
      text: "Back to events",
      active: false,
      icon: <Icon i="arrow-left" size={18} />,
    },
    { type: "divider" },
    {
      type: "item",
      href: base,
      text: "Event Home",
      active: isActive(base),
      icon: <Icon i="home" size={18} color="var(--tblr-cyan)" />,
    },
    { type: "divider" },
    {
      type: "item",
      href: `${base}/crm`,
      text: "Contacts",
      active: isActive(`${base}/crm`),
      icon: <Icon i="briefcase-2" size={18} color="var(--tblr-purple)" />,
    },
    {
      type: "item",
      href: `${base}/conversations`,
      text: "Conversations",
      active: isActive(`${base}/conversations`),
      icon: <Icon i="message" size={18} color="var(--tblr-green)" />,
    },
    { type: "divider" },
    {
      type: "dropdown",
      text: "Registration",
      icon: <Icon i="ticket" size={18} color="var(--tblr-orange)" />,
      children: [
        {
          type: "item",
          href: `${base}/registration/registrations`,
          text: "Registrations",
          active: isActive(`${base}/registration/registrations`),
          icon: <Icon i="ticket" size={18} color="var(--tblr-orange)" />,
        },
        {
          type: "item",
          href: `${base}/registration/teams`,
          text: "Teams",
          active: isActive(`${base}/registration/teams`),
          icon: <Icon i="users" size={18} color="var(--tblr-teal)" />,
        },
        {
          type: "item",
          href: `${base}/registration/form-builder`,
          text: "Form Builder",
          active: isActive(`${base}/registration/form-builder`),
          icon: <Icon i="forms" size={18} color="var(--tblr-purple)" />,
        },
        {
          type: "item",
          href: `${base}/registration/builder`,
          text: "Reg. Builder",
          active: isActive(`${base}/registration/builder`),
          icon: <Icon i="lego" size={18} color="var(--tblr-yellow)" />,
        },
        {
          type: "item",
          href: `${base}/registration/upsells`,
          text: "Upsells",
          active: isActive(`${base}/registration/upsells`),
          icon: <Icon i="gift" size={18} color="var(--tblr-blue)" />,
        },
      ],
    },
    { type: "divider" },
    {
      type: "dropdown",
      text: "Volunteer",
      icon: <Icon i="heart" size={18} color="var(--tblr-red)" />,
      children: [
        {
          type: "item",
          href: `${base}/volunteers`,
          text: "Volunteers",
          active: isActive(`${base}/volunteers`),
          icon: <Icon i="heart" size={18} color="var(--tblr-red)" />,
        },
        {
          type: "item",
          href: `${base}/volunteers/builder`,
          text: "Registration",
          active: isActive(`${base}/volunteers/builder`),
          icon: <Icon i="lego" size={18} color="var(--tblr-yellow)" />,
        },
        {
          type: "item",
          href: `${base}/volunteers/jobs`,
          text: "Jobs & Shifts",
          active: isActive(`${base}/volunteers/jobs`),
          icon: <Icon i="wall" size={18} color="var(--tblr-blue)" />,
        },
      ],
    },
    { type: "divider" },
    {
      type: "dropdown",
      text: "Public Pages",
      icon: <Icon i="external-link" size={18} color="var(--tblr-blue)" />,
      children: [
        {
          type: "item",
          href: `https://${event.slug}.geteventpilot.com/volunteer`,
          target: "_blank",
          text: "Volunteer Reg.",
          icon: <Icon i="heart" size={18} color="var(--tblr-red)" />,
        },
        {
          type: "item",
          href: `https://${event.slug}.geteventpilot.com/register`,
          target: "_blank",
          text: "Participant Reg.",
          icon: <Icon i="ticket" size={18} color="var(--tblr-orange)" />,
        },
      ],
    },
    { type: "divider" },
    {
      type: "item",
      href: isNew ? () => startOnboarding() : loginUrl,
      text: "Financials",
      active: isActive(`${base}/financials`),
      icon: <Icon i="currency-dollar" size={18} color="var(--tblr-green)" />,
      accessoryIcon: <Icon i="external-link" size={18} />,
      target: "_blank",
    },
    {
      type: "item",
      href: `${base}/settings`,
      text: "Settings",
      active: isActive(`${base}/settings`),
      icon: <Icon i="settings" size={18} />,
    },
  ];

  return (
    <Page title={title} sidenavItems={sidenavItems}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          minHeight: "calc(100dvh - 70px)",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <div style={{ width: "100%" }}>
          <Typography.H5 className={"mb-0 text-secondary"}>EVENT</Typography.H5>
          <Typography.H1>{event?.name}</Typography.H1>
          <Typography.Text className="mb-1">{description}</Typography.Text>
          {docsLink && (
            <Row gap={0.5} className={"tour__docslink"} align="center">
              <a
                href={docsLink}
                target="_blank"
                style={{ textDecoration: "underline" }}
              >
                More information
              </a>
            </Row>
          )}
          <hr style={{ margin: "1rem 0" }} />
          {loading ? <Loading gradient={false} /> : children}
          {tour && (
            <Button
              className="tour__help"
              variant="danger"
              primary
              style={{
                padding: 4,
                height: 32,
                position: "fixed",
                bottom: 10,
                right: 10,
                zIndex: 9999,
              }}
              onClick={tour}
            >
              <Row gap={0.5}>
                <Icon i={"help"} size={24} />
                Help!
              </Row>
            </Button>
          )}
        </div>
      </div>
    </Page>
  );
};
