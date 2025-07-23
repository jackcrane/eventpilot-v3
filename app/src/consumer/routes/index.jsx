import { Link, useParams } from "react-router-dom";
import { useReducedSubdomain } from "../../../hooks/useReducedSubdomain";
import { useEvent } from "../../../hooks/useEvent";
import { useCampaign } from "../../../hooks/useCampaign";
import { Typography, Alert } from "tabler-react-2";
import { Row } from "../../../util/Flex";
import { useFormBuilder } from "../../../hooks/useFormBuilder";
import { FormConsumer } from "../../../components/formConsumer/FormConsumer";
import { usePII } from "../../../hooks/usePII";
import styles from "./index.module.css";
import classNames from "classnames";
import { ThankYou } from "../../../components/formConsumer/ThankYou";
import { useState } from "react";
import { Icon } from "../../../util/Icon";
import { useLocations } from "../../../hooks/useLocations";

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
    <div className={styles.page}>
      <img className={styles.hero} src={event.banner?.location} />
      <div className={styles.content}>
        <div className={styles.container}>
          {" "}
          <Row gap={1} className={"mb-3"}>
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
                  This event does not have any fields configured yet. If you are
                  the event organizer, visit the{" "}
                  <Link
                    to={
                      "https://geteventpilot.com/events/" +
                      event?.id +
                      "/volunteers/builder"
                    }
                  >
                    volunteer registration builder
                  </Link>{" "}
                  to add fields and configure what information you wish to
                  collect from your volunteers.
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
        </div>
        <Typography.Text
          className={classNames("text-muted", styles.disclaimer)}
        >
          {event.name} uses <a href="https://geteventpilot.com">EventPilot</a>{" "}
          to manage their event. Your data is managed carefully and will not be
          sold or distributed to third parties by EventPilot. If you have any
          questions, please contact your event or EventPilot at{" "}
          <a href="mailto:support@geteventpilot.com">
            support@geteventpilot.com
          </a>
          . We want to make sure {event.name} is a great event for everyone.
          <br />
          <br />
          Never submit sensitive information like passwords or credit card
          information in this form.{" "}
          <a href="mailto:support@geteventpilot.com">Report abuse</a>.
        </Typography.Text>
      </div>
    </div>
  );
};
