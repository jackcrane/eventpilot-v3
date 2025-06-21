import { useParams } from "react-router-dom";
import { useReducedSubdomain } from "../../../hooks/useReducedSubdomain";
import { useEvent } from "../../../hooks/useEvent";
import { useCampaign } from "../../../hooks/useCampaign";
import { Typography } from "tabler-react-2";
import { Row } from "../../../util/Flex";
import { useFormBuilder } from "../../../hooks/useFormBuilder";
import { FormConsumer } from "../../../components/formConsumer/FormConsumer";
import { usePII } from "../../../hooks/usePII";

export const ConsumerIndex = () => {
  const { campaignSlug } = useParams();
  const eventSlug = useReducedSubdomain();
  const pii = usePII();

  const { event, loading, error } = useEvent({ eventId: eventSlug });

  const {
    fields,
    loading: loadingForm,
    error: errorForm,
    updateFields,
    submitForm,
    mutationLoading,
  } = useFormBuilder(eventSlug);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
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
            Volunteer Registration
          </Typography.H3>
          <Typography.H1>{event.name}</Typography.H1>
          <Typography.Text className={"mb-0"}>
            {event.description}
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
