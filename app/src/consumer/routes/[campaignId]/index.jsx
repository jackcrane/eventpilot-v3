import { useParams } from "react-router-dom";
import { useReducedSubdomain } from "../../../../hooks/useReducedSubdomain";
import { useEvent } from "../../../../hooks/useEvent";
import { Typography } from "tabler-react-2";
import { Row } from "../../../../util/Flex";
import { useFormBuilder } from "../../../../hooks/useFormBuilder";
import { FormConsumer } from "../../../../components/formConsumer/FormConsumer";
import { usePII } from "../../../../hooks/usePII";

export const EventRegistration = () => {
  const eventSlug = useReducedSubdomain(); // now used as eventId
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

  if (loading || loadingForm) {
    return <div>Loading...</div>;
  }

  if (error || errorForm) {
    return <div>Error: {error || errorForm}</div>;
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
