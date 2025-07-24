import { useReducedSubdomain } from "../../hooks/useReducedSubdomain";
import { useEvent } from "../../hooks/useEvent";
import { Typography } from "tabler-react-2";
import { Row } from "../../util/Flex";
import styles from "./ConsumerPage.module.css";
import classNames from "classnames";
import { Loading } from "../loading/Loading";
import { useTitle } from "react-use";

export const ConsumerPage = ({ children, title, loading }) => {
  const eventSlug = useReducedSubdomain();

  const {
    event,
    loading: eventLoading,
    error,
  } = useEvent({ eventId: eventSlug });
  useTitle(title ? `${title} | ${event?.name}` : event?.name);

  if (eventLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!event) {
    return <div>404 Event not found!</div>;
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
                {title}
              </Typography.H3>
              <Typography.H1>{event.name}</Typography.H1>
              <Typography.Text className={"mb-0"}>
                {event.description}
              </Typography.Text>
            </div>
          </Row>
          {loading ? <Loading /> : children}
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
