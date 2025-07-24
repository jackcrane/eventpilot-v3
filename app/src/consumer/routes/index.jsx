import { Link, useParams } from "react-router-dom";
import { useReducedSubdomain } from "../../../hooks/useReducedSubdomain";
import { useEvent } from "../../../hooks/useEvent";
import { useCampaign } from "../../../hooks/useCampaign";
import { Typography, Alert } from "tabler-react-2";
import { Row } from "../../../util/Flex";
import { useFormBuilder } from "../../../hooks/useFormBuilder";
import { FormConsumer } from "../../../components/formConsumer/FormConsumer";
import { usePII } from "../../../hooks/usePII";
import classNames from "classnames";
import { ThankYou } from "../../../components/formConsumer/ThankYou";
import { useState } from "react";
import { Icon } from "../../../util/Icon";
import { useLocations } from "../../../hooks/useLocations";
import { ConsumerPage } from "../../../components/ConsumerPage/ConsumerPage";

export const ConsumerIndex = () => {
  const eventSlug = useReducedSubdomain();
  const pii = usePII();

  const { event, loading, error } = useEvent({ eventId: eventSlug });

  const {
    fields,
    loading: loadingForm,
    error: errorForm,
    updateFields,
    submitForm: _submitForm,
    mutationLoading,
  } = useFormBuilder(eventSlug);
  const { loading: locationsLoading, locations } = useLocations({
    eventId: event?.id,
  });

  const [thankYou, setThankYou] = useState(false);

  const submitForm = async (values, shifts) => {
    if ((await _submitForm(values, shifts)).id) {
      // Scroll to top of page
      window.scrollTo(0, 0);
      setThankYou(true);
    } else {
      alert("Error submitting form");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!event) {
    return <div>Event not found!</div>;
  }

  return (
    <ConsumerPage title="Volunteer Registration" loading={loadingForm}>
      {errorForm ? (
        <div>Error: {errorForm}</div>
      ) : thankYou ? (
        <ThankYou event={event} />
      ) : fields?.length === 0 ||
        (locations?.length === 0 && !locationsLoading) ? (
        <div>
          <Typography.H2>No fields found</Typography.H2>
          <Alert
            variant="danger"
            className="mt-3"
            title="This event is not fully configured yet"
            icon={<Icon i="alert-hexagon" size={24} />}
          >
            <Typography.Text>
              This event does not have any fields configured yet. If you are the
              event organizer, visit the{" "}
              <Link
                to={
                  "https://geteventpilot.com/events/" +
                  event?.id +
                  "/volunteers/builder"
                }
              >
                volunteer registration builder
              </Link>{" "}
              to add fields and configure what information you wish to collect
              from your volunteers.
            </Typography.Text>
            {!locationsLoading && locations?.length === 0 && (
              <Typography.Text>
                Additionally, this event has no locations set up.
              </Typography.Text>
            )}
            <Typography.Text>
              Fields and locations are required in order to use EventPilot's
              volunteer registration system.
            </Typography.Text>
          </Alert>
        </div>
      ) : (
        <div>
          {mutationLoading && <div>Submitting...</div>}
          <FormConsumer
            fields={fields}
            onSubmit={submitForm}
            showShifts={true}
            eventId={event.id}
            loading={mutationLoading}
          />
        </div>
      )}
    </ConsumerPage>
  );
};
