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

export const RegisterPage = () => {
  const eventSlug = useReducedSubdomain();
  const {
    event,
    loading: eventLoading,
    error,
  } = useEvent({ eventId: eventSlug });
  const { loading, tiers } = useRegistrationConsumer({ eventId: event?.id });

  const [tier, setTier] = useState(null);

  return (
    <ConsumerPage title="Register" loading={loading || eventLoading}>
      {tiers?.length > 0 ? (
        <>
          <Typography.H2>Step 1: Your Information</Typography.H2>
          <Typography.H2>Step 2: Pick your Tier</Typography.H2>
          <Typography.Text>
            It is time to pick out what tier you want to register for.
          </Typography.Text>
          <EnclosedSelectGroup
            value={tier}
            items={tiers.map((t) => ({
              label: (
                <>
                  <Typography.H3 className="mb-0">{t.name}</Typography.H3>
                  <Typography.Text className="mb-3">
                    {t.description}
                  </Typography.Text>
                  {t.disabled ? (
                    <>
                      <Typography.Text className="text-muted mb-0">
                        This tier is not available at this time.
                      </Typography.Text>
                    </>
                  ) : (
                    <>
                      <Badge color="green-lt">
                        <span
                          className="text-green"
                          style={{ fontSize: "0.8rem" }}
                        >
                          ${parseInt(t.period.price)?.toFixed(2)}
                        </span>
                      </Badge>
                    </>
                  )}
                </>
              ),
              value: t.id,
              id: t.id,
              disabled: t.disabled,
            }))}
            onChange={setTier}
            direction="column"
          />
        </>
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
