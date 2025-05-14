import { useParams } from "react-router-dom";
import { useReducedSubdomain } from "../../../../hooks/useReducedSubdomain";
import { useEvent } from "../../../../hooks/useEvent";
import { useCampaign } from "../../../../hooks/useCampaign";
import { Typography } from "tabler-react-2";
import { Row } from "../../../../util/Flex";
import { useFormBuilder } from "../../../../hooks/useFormBuilder";
import { FormConsumer } from "../../../../components/formConsumer/FormConsumer";
import { usePII } from "../../../../hooks/usePII";

export const Campaign = () => {
  const { campaignSlug } = useParams();
  const eventSlug = useReducedSubdomain();
  const pii = usePII();

  const { event, loading, error } = useEvent({ eventId: eventSlug });
  const {
    campaign,
    loading: loadingCampaign,
    error: errorCampaign,
  } = useCampaign({ eventId: eventSlug, campaignId: campaignSlug });
  const {
    fields,
    loading: loadingForm,
    error: errorForm,
    updateFields,
    submitForm,
    mutationLoading,
  } = useFormBuilder(eventSlug, campaignSlug);

  if (loading || loadingCampaign) {
    return <div>Loading...</div>;
  }

  if (error || errorCampaign) {
    return <div>Error: {error || errorCampaign}</div>;
  }

  return (
    <div
      style={{
        margin: "20px",
      }}
    >
      <Row gap={1}>
        <img
          src={event.logo?.location}
          alt={event.name}
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "10px",
            objectFit: "cover",
          }}
        />
        <div>
          <Typography.H3 className={"mb-0 text-secondary"}>
            {event.name}
          </Typography.H3>
          <Typography.H1>{campaign.name}</Typography.H1>
          <Typography.Text className={"mb-0"}>
            {campaign.description}
          </Typography.Text>
        </div>
      </Row>
      {loadingForm ? (
        <div>Loading...</div>
      ) : errorForm ? (
        <div>Error: {errorForm}</div>
      ) : (
        <div>
          <Typography.H5 className={"mb-0 text-secondary"}>
            Registration Form
          </Typography.H5>
          {mutationLoading && <div>Submitting...</div>}
          <FormConsumer fields={fields} onSubmit={submitForm} />
        </div>
      )}
    </div>
  );
};
