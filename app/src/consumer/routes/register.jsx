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

export const RegisterPage = () => {
  const eventSlug = useReducedSubdomain();
  const {
    event,
    loading: eventLoading,
    error,
  } = useEvent({ eventId: eventSlug });
  const { loading, tiers } = useRegistrationConsumer({ eventId: event?.id });
  const { pages } = useParticipantRegistrationForm({ eventId: event?.id });

  const [tier, setTier] = useState(null);

  return (
    <ConsumerPage title="Register" loading={loading || eventLoading}>
      {tiers?.length > 0 && pages?.length > 0 ? (
        <div className="mt-4">
          <FormConsumer pages={pages} />
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
