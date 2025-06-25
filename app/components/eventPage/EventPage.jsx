import { Typography, Util, Button } from "tabler-react-2";
import { useParsedUrl } from "../../hooks/useParsedUrl";
import { Row } from "../../util/Flex";
import { useParams } from "react-router-dom";
import { Page } from "../page/Page";
import { Icon } from "../../util/Icon";
import { useEvent } from "../../hooks/useEvent";

export const EventPage = ({ children, title, tour }) => {
  const { eventId } = useParams();
  const { event, loading, error, refetch } = useEvent({
    eventId,
  });
  const url = useParsedUrl(window.location.pathname);

  if (loading)
    return (
      <Page title={title}>
        <Typography.Text>Loading...</Typography.Text>
      </Page>
    );

  return (
    <Page title={title}>
      <Typography.H5 className={"mb-0 text-secondary"}>EVENT</Typography.H5>
      <Typography.H1>{event?.name}</Typography.H1>
      <Row gap={1} className={"tour__navbar"}>
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
      </Row>
      <hr style={{ margin: "1rem 0" }} />
      {children}
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
            left: 10,
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
    </Page>
  );
};
