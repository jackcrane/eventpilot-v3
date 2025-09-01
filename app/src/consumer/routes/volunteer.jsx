import { Link, useParams, useSearchParams } from "react-router-dom";
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
import { useEffect, useState } from "react";
import { mutate } from "swr";
import { Icon } from "../../../util/Icon";
import { useLocations } from "../../../hooks/useLocations";
import { ConsumerPage } from "../../../components/ConsumerPage/ConsumerPage";

export const VolunteerRegistrationPage = () => {
  const eventSlug = useReducedSubdomain();
  const pii = usePII();

  const { event, loading, error } = useEvent({ eventId: eventSlug });
  const [searchParams] = useSearchParams();
  const [instanceReady, setInstanceReady] = useState(false);
  const [instanceError, setInstanceError] = useState(null);

  // Resolve instance: ?i=instanceId or next upcoming from event.instances
  useEffect(() => {
    if (!event || loading) return;
    const iParam = searchParams.get("i");
    const now = new Date();

    const findInstance = (id) => event?.instances?.find((ins) => ins.id === id);
    const getNextUpcoming = () => {
      const eligible = (event?.instances || []).filter(
        (ins) => new Date(ins.endTime).getTime() > now.getTime()
      );
      if (eligible.length === 0) return null;
      return eligible.reduce((a, b) =>
        new Date(a.startTime).getTime() < new Date(b.startTime).getTime()
          ? a
          : b
      );
    };

    if (iParam) {
      const requested = findInstance(iParam);
      if (!requested) {
        setInstanceError(
          "The requested instance does not exist for this event."
        );
        localStorage.removeItem("instance");
        setInstanceReady(false);
        return;
      }
      const passed = new Date(requested.endTime).getTime() <= now.getTime();
      if (passed) {
        setInstanceError("The requested instance has already ended.");
        localStorage.removeItem("instance");
        setInstanceReady(false);
        return;
      }
      localStorage.setItem("instance", requested.id);
      setInstanceError(null);
      setInstanceReady(true);
      // Revalidate volunteer endpoints with the new instance header
      if (eventSlug) {
        mutate(`/api/events/${eventSlug}/builder`);
      }
      if (event?.id) {
        mutate(`/api/events/${event.id}/locations`);
      }
      return;
    }

    const next = getNextUpcoming();
    if (!next) {
      setInstanceError("No upcoming instances are available for volunteering.");
      localStorage.removeItem("instance");
      setInstanceReady(false);
      return;
    }
    localStorage.setItem("instance", next.id);
    setInstanceError(null);
    setInstanceReady(true);
    if (eventSlug) {
      mutate(`/api/events/${eventSlug}/builder`);
    }
    if (event?.id) {
      mutate(`/api/events/${event.id}/locations`);
    }
  }, [event, loading, searchParams]);

  const {
    fields,
    loading: loadingForm,
    error: errorForm,
    updateFields,
    submitForm: _submitForm,
    mutationLoading,
  } = useFormBuilder(instanceReady ? eventSlug : null);
  const { loading: locationsLoading, locations } = useLocations({
    eventId: instanceReady ? event?.id : null,
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
      {instanceError && (
        <Alert
          variant="danger"
          className="mt-3"
          title="Instance selection error"
          icon={<Icon i="alert-hexagon" size={24} />}
        >
          <Typography.Text className="mb-0">{instanceError}</Typography.Text>
        </Alert>
      )}
      {errorForm ? (
        <div>Error: {errorForm}</div>
      ) : thankYou ? (
        <ThankYou event={event} />
      ) : (!instanceError && fields?.length === 0) ||
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
