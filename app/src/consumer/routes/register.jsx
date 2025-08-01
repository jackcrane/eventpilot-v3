import {
  Typography,
  Alert,
  Button,
  Input,
  Badge,
  EnclosedSelectGroup,
} from "tabler-react-2";
import { ConsumerPage } from "../../../components/ConsumerPage/ConsumerPage";
import { useEvent } from "../../../hooks/useEvent";
import { useReducedSubdomain } from "../../../hooks/useReducedSubdomain";
import { useRegistrationConsumer } from "../../../hooks/useRegistrationConsumer";
import { Icon } from "../../../util/Icon";
import { Link } from "react-router-dom";
import { useState } from "react";
import { FormConsumer } from "../../../components/FormConsumer.v2/FormConsumer";
import { useParticipantRegistrationForm } from "../../../hooks/useParticipantRegistrationForm";
import { PaymentElement } from "../../../components/stripe/PaymentElement";

export const RegisterPage = () => {
  const eventSlug = useReducedSubdomain();
  const {
    event,
    loading: eventLoading,
    error,
  } = useEvent({ eventId: eventSlug });
  const {
    loading,
    tiers,
    submit,
    mutationLoading,
    requiresPayment,
    stripePIClientSecret,
    finalized,
  } = useRegistrationConsumer({
    eventId: event?.id,
  });
  const { pages } = useParticipantRegistrationForm({ eventId: event?.id });

  return (
    <ConsumerPage title="Register" loading={loading || eventLoading}>
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
          <PaymentElement
            paymentIntentClientSecret={stripePIClientSecret}
            eventStripeConnectedAccountId={event.stripeConnectedAccountId}
          />
        </>
      ) : tiers?.length > 0 && pages?.length > 0 ? (
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
              information you wish to collect from your volunteers.
            </Typography.Text>
          </Alert>
        </div>
      )}
    </ConsumerPage>
  );
};
