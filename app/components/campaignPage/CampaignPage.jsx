import { Typography, Util, Button } from "tabler-react-2";
import { useCampaign } from "../../hooks/useCampaign";
import { useParsedUrl } from "../../hooks/useParsedUrl";
import { Row } from "../../util/Flex";
import { useParams } from "react-router-dom";
import { Page } from "../page/Page";
import { Icon } from "../../util/Icon";

export const CampaignPage = ({ children, title }) => {
  const { eventId, campaignId } = useParams();
  const { campaign, loading, error, refetch } = useCampaign({
    eventId,
    campaignId,
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
      <Typography.H5 className={"mb-0 text-secondary"}>CAMPAIGN</Typography.H5>
      <Typography.H1>{campaign?.name}</Typography.H1>
      <Row gap={1}>
        <Button href={`/events/${eventId}`} ghost variant="secondary" size="sm">
          <Row gap={1}>
            <Icon i={"arrow-left"} size="inherit" />
            Back to Event
          </Row>
        </Button>
        <Button
          variant={Object.values(url).includes(true) ? "secondary" : "primary"}
          size="sm"
          ghost={Object.values(url).includes(true)}
          href={`/events/${eventId}/campaigns/${campaignId}`}
        >
          <Row gap={1}>
            <Icon i={"home"} size="inherit" />
            Campaign Home
          </Row>
        </Button>
        <Button
          variant={url.volunteers ? "primary" : "secondary"}
          ghost={!url.volunteers}
          size="sm"
          href={`/events/${eventId}/campaigns/${campaignId}/volunteers`}
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
          href={`/events/${eventId}/campaigns/${campaignId}/builder`}
        >
          <Row gap={1}>
            <Icon i={"lego"} size="inherit" />
            Registration Builder
          </Row>
        </Button>
      </Row>
      <hr style={{ margin: "1rem 0" }} />
      {children}
    </Page>
  );
};
