import { Typography, Util, Button } from "tabler-react-2";
import { useCampaign } from "../../hooks/useCampaign";
import { useParsedUrl } from "../../hooks/useParsedUrl";
import { Row } from "../../util/Flex";
import { useParams } from "react-router-dom";
import { Page } from "../page/Page";
import { Icon } from "../../util/Icon";
import { useEvent } from "../../hooks/useEvent";

export const EventPage = ({ children, title }) => {
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
      <Row gap={1}>
        <Button href={`/events`} ghost variant="secondary" size="sm">
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
        >
          <Row gap={1}>
            <Icon i={"home"} size="inherit" />
            Event Home
          </Row>
        </Button>
        <Button
          variant={url.campaigns ? "primary" : "secondary"}
          ghost={!url.campaigns}
          size="sm"
          href={`/events/${eventId}/campaigns`}
        >
          <Row gap={1}>
            <Icon i={"target-arrow"} size="inherit" />
            Campaigns
          </Row>
        </Button>
        <Button
          variant={url.jobs ? "primary" : "secondary"}
          ghost={!url.jobs}
          size="sm"
          href={`/events/${eventId}/jobs`}
        >
          <Row gap={1}>
            <Icon i={"wall"} size="inherit" />
            Jobs & Shift Builder
          </Row>
        </Button>
      </Row>
      <hr style={{ margin: "1rem 0" }} />
      {children}
    </Page>
  );
};
