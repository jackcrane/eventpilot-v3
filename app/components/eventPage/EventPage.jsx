import { Typography, Util, Button } from "tabler-react-2";
import { useParsedUrl } from "../../hooks/useParsedUrl";
import { Row } from "../../util/Flex";
import { useParams } from "react-router-dom";
import { Page } from "../page/Page";
import { Icon } from "../../util/Icon";
import { useEvent } from "../../hooks/useEvent";
import { Loading } from "../loading/Loading";
import { Sidenav } from "../sidenav/Sidenav";

export const EventPage = ({
  children,
  title,
  tour,
  loading,
  description,
  docsLink,
}) => {
  const { eventId } = useParams();
  const {
    event,
    loading: eventLoading,
    error,
    refetch,
  } = useEvent({
    eventId,
  });
  const url = useParsedUrl(window.location.pathname);

  if (eventLoading)
    return (
      <Page title={title}>
        <Loading />
      </Page>
    );

  return (
    <Page
      title={title}
      sidenavItems={[
        {
          type: "item",
          href: "/events",
          text: "Back to events",
          active: false,
          icon: <Icon i="arrow-left" size={18} />,
        },
        {
          type: "divider",
        },
        {
          type: "item",
          href: `/events/${eventId}`,
          text: `Event Home`,
          active: !Object.values(url).includes(true),
          icon: <Icon i="home" size={18} />,
        },
        {
          type: "divider",
        },
        {
          type: "item",
          href: `/events/${eventId}/crm`,
          text: "Contacts",
          active: url.crm,
          icon: <Icon i="briefcase-2" size={18} />,
        },
        {
          type: "item",
          href: `/events/${eventId}/conversations`,
          text: `Conversations`,
          active: url.conversations,
          icon: <Icon i="message" size={18} />,
        },
        {
          type: "divider",
        },
        {
          type: "item",
          href: `/events/${eventId}/volunteers`,
          text: `Volunteers`,
          active: url.volunteers,
          icon: <Icon i="heart" size={18} />,
        },
        {
          type: "item",
          href: `/events/${eventId}/builder`,
          text: `Registration Builder`,
          active: url.builder,
          icon: <Icon i="lego" size={18} />,
        },
        {
          type: "item",
          href: `/events/${eventId}/jobs`,
          text: `Jobs & Shift Builder`,
          active: url.jobs,
          icon: <Icon i="wall" size={18} />,
        },
        {
          type: "divider",
        },
        {
          type: "item",
          href: `/events/${eventId}/settings`,
          text: `Settings`,
          active: url.settings,
          icon: <Icon i="settings" size={18} />,
        },
      ]}
    >
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

/*




        {/* <Row gap={1} className={"tour__navbar"}>
        <Button
        href={`/events`}
        ghost
        variant="secondary"
        size="sm"
        className="tour__navbar-back"
        >
          <Row gap={1}>
            <Icon i={"arrow-left"} size="inherit" />
            Back to Events
          </Row>
        </Button>
        <Button
          variant={Object.values(url).includes(true) ? "secondary" : "primary"}
          size="sm"
          ghost={Object.values(url).includes(true)}
          href={`/events/${eventId}`}
          className="tour__navbar-home"
        >
          <Row gap={1}>
            <Icon i={"home"} size="inherit" />
            Event Home
          </Row>
        </Button>
        <Button
          variant={url.conversations ? "primary" : "secondary"}
          ghost={!url.conversations}
          size="sm"
          href={`/events/${eventId}/conversations`}
          className="tour__navbar-conversations"
        >
          <Row gap={1}>
            <Icon i={"message"} size="inherit" />
            Conversations
          </Row>
        </Button>
        <Button
          variant={url.volunteers ? "primary" : "secondary"}
          ghost={!url.volunteers}
          size="sm"
          href={`/events/${eventId}/volunteers`}
          className="tour__navbar-volunteers"
        >
          <Row gap={1}>
            <Icon i={"heart"} size="inherit" />
            Volunteers
          </Row>
        </Button>
        <Button
          variant={url.builder ? "primary" : "secondary"}
          ghost={!url.builder}
          size="sm"
          href={`/events/${eventId}/builder`}
          className="tour__navbar-builder"
        >
          <Row gap={1}>
            <Icon i={"lego"} size="inherit" />
            Registration Builder
          </Row>
        </Button>
        <Button
          variant={url.jobs ? "primary" : "secondary"}
          ghost={!url.jobs}
          size="sm"
          href={`/events/${eventId}/jobs`}
          className="tour__navbar-jobs"
        >
          <Row gap={1}>
            <Icon i={"wall"} size="inherit" />
            Jobs & Shift Builder
          </Row>
        </Button>
        <Button
          variant={url.settings ? "primary" : "secondary"}
          ghost={!url.settings}
          size="sm"
          href={`/events/${eventId}/settings`}
          className="tour__navbar-settings"
        >
          <Row gap={1}>
            <Icon i={"settings"} size="inherit" />
            Settings
          </Row>
        </Button>
        <Button
          variant={url.crm ? "primary" : "secondary"}
          ghost={!url.crm}
          size="sm"
          href={`/events/${eventId}/crm`}
          className="tour__navbar-crm"
        >
          <Row gap={1}>
            <Icon i={"briefcase-2"} size="inherit" />
            Contacts
          </Row>
        </Button>
        </Row> */
