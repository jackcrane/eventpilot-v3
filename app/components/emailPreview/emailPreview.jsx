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

  const to =
    email.type === "OUTBOUND"
      ? email.to
      : email.to.map((to) => `${to.name} <${to.email}>`).join(", ");

  const initials =
    email.type === "OUTBOUND"
      ? extractInitialsFromName(email.crmPerson?.name)
      : extractInitialsFromName(email.from.name);

  const from =
    email.type === "OUTBOUND"
      ? email.from
      : `${email.from.name} <${email.from.email}>`;

  return (
    <a
      href={`/email/${emailId}`}
      className={styles.emailPreviewPrompt}
      target="_blank"
    >
      <Row className={"card p-1"} gap={1} align="center">
        <div style={{ alignSelf: "flex-start" }}>
          <Avatar initials={extractInitialsFromName(initials)} />
        </div>
        <div>
          <Col gap={0.25} align="flex-start">
            <Row gap={0.5} align="flex-start">
              <Typography.Text className="text-muted mb-0">To:</Typography.Text>
              <Typography.Text className="mb-0" style={{ textAlign: "left" }}>
                {to}
              </Typography.Text>
            </Row>
            <Row gap={0.5} align="flex-start">
              <Typography.Text className="text-muted mb-0">
                From:
              </Typography.Text>
              <Typography.Text className="mb-0" style={{ textAlign: "left" }}>
                {from}
              </Typography.Text>
            </Row>
            <Row gap={0.5}>
              <Typography.Text className="text-muted mb-0">
                Subject:
              </Typography.Text>
              <Typography.Text className="mb-0" style={{ textAlign: "left" }}>
                {email.subject}
              </Typography.Text>
            </Row>
            <Row gap={0.5}>
              <Typography.Text className="text-muted mb-0">
                Sent:
              </Typography.Text>
              <Typography.Text className="mb-0" style={{ textAlign: "left" }}>
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

  if (!email.htmlBody && !email.textBody)
    return "This email does not have a recorded body.";

  const to =
    email.type === "OUTBOUND"
      ? email.to
      : email.to.map((to) => `${to.name} <${to.email}>`).join(", ");

  const initials =
    email.type === "OUTBOUND"
      ? extractInitialsFromName(email.from)
      : extractInitialsFromName(email.from.name);

  const from =
    email.type === "OUTBOUND"
      ? email.from
      : `${email.from.name} <${email.from.email}>`;

  return (
    <div>
      <Card
        title={
          <Row gap={1} align="flex-start">
            {from.includes("EventPilot Support") ? (
              <Avatar src={eventpilotLogo} alt="EventPilot Logo" />
            ) : (
              <Avatar initials={initials} />
            )}
            <Col gap={1} align="flex-start">
              <Typography.H3 className="mb-0">
                <span className="text-muted">To:</span> {to}
              </Typography.H3>
              <Typography.Text className="mb-0">
                <span className="text-muted">From:</span> {from}
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
        <div
          dangerouslySetInnerHTML={{ __html: email.htmlBody || email.textBody }}
          style={{ whiteSpace: "pre-wrap" }}
        />
      </Card>
    </div>
  );
};
