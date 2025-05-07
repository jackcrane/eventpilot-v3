import { useParams } from "react-router-dom";
import { useReducedSubdomain } from "../../../../hooks/useReducedSubdomain";
import { useEvent } from "../../../../hooks/useEvent";
import { useCampaign } from "../../../../hooks/useCampaign";

export const Campaign = () => {
  const { campaignSlug } = useParams();
  const eventSlug = useReducedSubdomain();

  const { event, loading, error } = useEvent({ eventId: eventSlug });
  const {
    campaign,
    loading: loadingCampaign,
    error: errorCampaign,
  } = useCampaign({ eventId: eventSlug, campaignId: campaignSlug });

  if (loading || loadingCampaign) {
    return <div>Loading...</div>;
  }

  if (error || errorCampaign) {
    return <div>Error: {error || errorCampaign}</div>;
  }

  return <div>{JSON.stringify({ event, campaign })}</div>;
};
