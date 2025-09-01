import { Typography, Alert, Input, Button } from "tabler-react-2";
import { ConsumerPage } from "../../../components/ConsumerPage/ConsumerPage";
import { useEvent } from "../../../hooks/useEvent";
import { useReducedSubdomain } from "../../../hooks/useReducedSubdomain";
import { useRegistrationConsumer } from "../../../hooks/useRegistrationConsumer";
import { Icon } from "../../../util/Icon";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { mutate } from "swr";
import { FormConsumer } from "../../../components/FormConsumer.v2/FormConsumer";
import { useParticipantRegistrationForm } from "../../../hooks/useParticipantRegistrationForm";
import { PaymentElement } from "../../../components/stripe/PaymentElement";
import { Row } from "../../../util/Flex";

export const RegisterPage = () => {
  const eventSlug = useReducedSubdomain();
  const [searchParams] = useSearchParams();
  const [instanceReady, setInstanceReady] = useState(false);
  const [instanceError, setInstanceError] = useState(null);
  const [couponInput, setCouponInput] = useState("");
  const {
    event,
    loading: eventLoading,
    error,
  } = useEvent({ eventId: eventSlug });

  // Resolve instance: ?i=instanceId or next upcoming from event.instances
  useEffect(() => {
    if (!event || eventLoading) return;
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
      // Revalidate consumer endpoints with the new instance header
      if (event?.id) {
        mutate(`/api/events/${event.id}/registration/consumer`);
        mutate(`/api/events/${event.id}/registration/form`);
      }
      return;
    }

    const next = getNextUpcoming();
    if (!next) {
      setInstanceError("No upcoming instances are available for registration.");
      localStorage.removeItem("instance");
      setInstanceReady(false);
      return;
    }
    localStorage.setItem("instance", next.id);
    setInstanceError(null);
    setInstanceReady(true);
    if (event?.id) {
      mutate(`/api/events/${event.id}/registration/consumer`);
      mutate(`/api/events/${event.id}/registration/form`);
    }
  }, [event, eventLoading, searchParams]);

  const {
    loading,
    tiers,
    submit,
    mutationLoading,
    requiresPayment,
    stripePIClientSecret,
    finalized,
    price,
    applyCoupon,
    applyLoading,
  } = useRegistrationConsumer({
    eventId: instanceReady ? event?.id : null,
  });
  const { pages } = useParticipantRegistrationForm({
    eventId: instanceReady ? event?.id : null,
  });

  return (
    <ConsumerPage title="Register" loading={loading || eventLoading}>
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
      {finalized ? (
        <>
          <Alert variant="success" className="mt-3" title="Thank you!">
            <Typography.Text className="mb-0">
              Thank you for registering! Your registration has been confirmed.
            </Typography.Text>
          </Alert>
        </>
      ) : requiresPayment ? (
        <>
          <div className="card card-body mb-3">
            <Typography.H3 className="mb-2">Have a coupon?</Typography.H3>
            <Row gap={1} align="center">
              <Input
                placeholder="Enter coupon code"
                value={couponInput}
                onChange={(v) => setCouponInput(v)}
                style={{ flex: 1 }}
                className="mb-0"
              />
              <Button
                onClick={() => applyCoupon(couponInput)}
                loading={applyLoading}
              >
                Apply
              </Button>
            </Row>
          </div>
          <PaymentElement
            paymentIntentClientSecret={stripePIClientSecret}
            total={price}
            eventStripeConnectedAccountId={event.stripeConnectedAccountId}
          />
        </>
      ) : !instanceError && tiers?.length > 0 && pages?.length > 0 ? (
        <div className="mt-4">
          <FormConsumer
            pages={pages}
            eventId={event?.id}
            onSubmit={submit}
            mutationLoading={mutationLoading}
          />
        </div>
      ) : (
        <div>
          <Alert
            variant="danger"
            className="mt-3"
            title="This event is not fully configured yet"
            icon={<Icon i="alert-hexagon" size={24} />}
          >
            <Typography.Text className="mb-0">
              This event does not have any tiers configured yet. If you are the
              event organizer, visit the{" "}
              <Link
                to={
                  "https://geteventpilot.com/events/" +
                  event?.id +
                  "/registration/builder"
                }
              >
                participant registration builder
              </Link>{" "}
              to add fields, set up pricing tiers, and configure what
              information you wish to collect from your participants.
            </Typography.Text>
          </Alert>
        </div>
      )}
    </ConsumerPage>
  );
};
