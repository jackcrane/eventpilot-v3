import { useParams } from "react-router-dom";
import { Page } from "../../../../../../components/page/Page";
import { useEvent } from "../../../../../../hooks/useEvent";
import { Typography } from "tabler-react-2";
import { useCampaign } from "../../../../../../hooks/useCampaign";

export const Campaign = () => {
  const { eventId, campaignId } = useParams();
  const { campaign, loading, error, refetch } = useCampaign({
    eventId,
    campaignId,
  });

  if (loading) return <Typography.Text>Loading...</Typography.Text>;

  return (
    <Page title="Event">
      <Typography.H5 className={"mb-0 text-secondary"}>CAMPAIGN</Typography.H5>
      <Typography.H1>{campaign?.name}</Typography.H1>
    </Page>
  );
};
