import moment from "moment";
import { useCrmPerson } from "../../hooks/useCrmPerson";
import { useEmail } from "../../hooks/useEmail";
import { Col, Row } from "../../util/Flex";
import { Avatar, Button, Card, Typography, Util } from "tabler-react-2";
import styles from "./emailPreview.module.css";
import classNames from "classnames";
import { Icon } from "../../util/Icon";
import eventpilotLogo from "../../assets/logo-sharp.png";
import { useEvent } from "../../hooks/useEvent";
import { Loading } from "../loading/Loading";
import { useState } from "react";

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

const Attachment = ({ attachment }) => {
  const { originalname, location, contentType, size } = attachment.file;
  const isImage = contentType.includes("image");

  return (
    <Row
      gap={1}
      align="center"
      className="card"
      style={{ maxWidth: 500, overflow: "hidden" }}
    >
      {isImage && (
        <img src={location} alt={originalname} style={{ maxWidth: 100 }} />
      )}
      <Col gap={1} align="flex-start">
        <Typography.Text className="mb-0" style={{ textAlign: "left" }}>
          {originalname}
        </Typography.Text>
        <Typography.Text className="mb-0" style={{ textAlign: "left" }}>
          {contentType}, {size} bytes
        </Typography.Text>
      </Col>
    </Row>
  );
};

export const EmailPreview = ({ emailId, showIcon = false }) => {
  const { email, loading } = useEmail({ emailId });
  const [viewAutoResponseAnyway, setViewAutoResponseAnyway] = useState(false);

  const from =
    email?.type === "OUTBOUND"
      ? email?.from
      : `${email?.from?.name} <${email?.from?.email}>`;

  const getSlugFromEmail = (input) => {
    if (!input) return null;
    const match = input.match(/<([^>]+)>/);
    const email = match ? match[1] : input;
    // take the part before the @, then split on "+" and return the third segment
    const localPart = email.split("@")[0];
    return localPart.split("+")[2];
  };

  const { event } = useEvent({
    eventId: getSlugFromEmail(
      email?.type === "OUTBOUND" ? from : email?.from?.email
    ),
  });

  if (loading)
    return (
      <Card>
        <Loading gradient={false} />
      </Card>
    );
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

  if (email.isAutogeneratedResponse && !viewAutoResponseAnyway) {
    return (
      <Util.Hr
        text={
          <Row gap={1}>
            <Typography.Text className="mb-0">
              An automated acknowledgement of receipt was sent.
            </Typography.Text>
            <Button size="sm" onClick={() => setViewAutoResponseAnyway(true)}>
              View anyway
            </Button>
          </Row>
        }
      />
    );
  }

  return (
    <div>
      <Card
        title={
          <Row gap={1} align="flex-start">
            <Col gap={1} align="center">
              {event ? (
                <Avatar src={event.logo?.location} alt={event.name} />
              ) : from.includes("EventPilot Support") ? (
                <Avatar src={eventpilotLogo} alt="EventPilot Logo" />
              ) : (
                <Avatar initials={initials} />
              )}
              {showIcon && (
                <Icon
                  i={email.type === "OUTBOUND" ? "arrow-up" : "arrow-down"}
                  size={32}
                />
              )}
            </Col>
            <Col gap={1} align="flex-start">
              <Typography.H3 className="mb-0">
                <span className="text-muted">From:</span> {from}
              </Typography.H3>
              <Typography.Text className="mb-0">
                <span className="text-muted">To:</span> {to}
              </Typography.Text>
              <Typography.Text className="mb-0">
                <span className="text-muted">Sent:</span>{" "}
                {moment(email.receivedAt || email.createdAt).format(
                  "MMM DD, h:mm a"
                )}
              </Typography.Text>
              <Typography.H2 className="mb-0">
                <span className="text-muted">Subject:</span> {email.subject}
              </Typography.H2>
              {email.attachments?.length > 0 && (
                <>
                  <Typography.Text className="mb-0">
                    <span className="text-muted">Attachments:</span>{" "}
                  </Typography.Text>
                  <Row gap={1} align="flex-start">
                    {email.attachments.map((a) => (
                      <Attachment key={a.id} attachment={a} />
                    ))}
                  </Row>
                </>
              )}
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
