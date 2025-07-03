import moment from "moment";
import { useCrmPerson } from "../../hooks/useCrmPerson";
import { useEmail } from "../../hooks/useEmail";
import { Col, Row } from "../../util/Flex";
import { Avatar, Badge, Card, Typography, Util } from "tabler-react-2";
import styles from "./emailPreview.module.css";
import classNames from "classnames";
import { Icon } from "../../util/Icon";
import eventpilotLogo from "../../assets/logo-sharp.png";

const extractInitialsFromName = (name) => {
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0].slice(0, 1) + parts[1].slice(0, 1);
};

export const EmailPreviewPrompt = ({ emailId }) => {
  const { email, loading } = useEmail({ emailId });

  if (loading) return null;
  if (!email) return null;

  return (
    <a
      href={`/email/${emailId}`}
      className={styles.emailPreviewPrompt}
      target="_blank"
    >
      <Row className={"card p-1"} gap={1} align="center">
        <Avatar initials={extractInitialsFromName(email.crmPerson.name)} />
        <div>
          <Col gap={0.25} align="flex-start">
            <Row gap={0.5}>
              <Typography.Text className="text-muted mb-0">To:</Typography.Text>
              <Typography.Text className="mb-0">{email.to}</Typography.Text>
            </Row>
            <Row gap={0.5}>
              <Typography.Text className="text-muted mb-0">
                Subject:
              </Typography.Text>
              <Typography.Text className="mb-0">
                {email.subject}
              </Typography.Text>
            </Row>
            <Row gap={0.5}>
              <Typography.Text className="text-muted mb-0">
                Sent:
              </Typography.Text>
              <Typography.Text className="mb-0">
                {moment(email.createdAt).format("M/DD/YYYY h:mm a")}
              </Typography.Text>
            </Row>
          </Col>
        </div>
        <div style={{ flex: 1 }} />
        <div className={styles.goLink}>
          View
          <Icon i="external-link" size={32} />
        </div>
      </Row>
    </a>
  );
};

export const EmailPreview = ({ emailId }) => {
  const { email, loading } = useEmail({ emailId });

  if (loading) return null;
  if (!email) return null;

  if (!email.htmlBody) return "This email does not have a recorded HTML body.";

  return (
    <div>
      <Card
        title={
          <Row gap={1} align="flex-start">
            {email.from.includes("EventPilot Support") ? (
              <Avatar src={eventpilotLogo} alt="EventPilot Logo" />
            ) : (
              <Avatar initials={extractInitialsFromName(email.from)} />
            )}
            <Col gap={1} align="flex-start">
              <Typography.H3 className="mb-0">
                <span className="text-muted">To:</span> {email.to}
              </Typography.H3>
              <Typography.Text className="mb-0">
                <span className="text-muted">From:</span> {email.from}
              </Typography.Text>
              <Typography.Text className="mb-0">
                <span className="text-muted">Sent:</span>{" "}
                {moment(email.createdAt).format("MMM DD, h:mm a")}
              </Typography.Text>
              <Typography.H1 className="mb-0">
                <span className="text-muted">Subject:</span> {email.subject}
              </Typography.H1>
            </Col>
          </Row>
        }
      >
        <div dangerouslySetInnerHTML={{ __html: email.htmlBody }} />
      </Card>
    </div>
  );
};
