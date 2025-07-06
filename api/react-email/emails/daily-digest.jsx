import {
  Body,
  Button,
  Container,
  Font,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";

const baseUrl = "";

/** @type {{ main: import("react").CSSProperties }} */
const styles = {
  main: {
    backgroundColor: "#f7f7f7",
  },
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    border: "1px solid #eee",
    backgroundColor: "#ffffff",
  },
  content: {
    padding: "20px",
  },
  heading: {
    fontWeight: 400,
  },
  button: {
    backgroundColor: "#0072ce",
    color: "#ffffff",
    borderRadius: "5px",
    padding: "8px 16px",
    textDecoration: "none",
    border: "none",
    display: "inline-block",
  },
  or: {
    color: "#8898aa",
    fontSize: "12px",
    lineHeight: "16px",
    display: "inline-block",
  },
  stat: {
    backgroundColor: "#f7f7f7",
    borderRadius: "5px",
    padding: "8px 16px",
    width: "33%",
  },
  statTitle: {
    color: "#8898aa",
    fontSize: 16,
    margin: 0,
    display: "inline-block",
  },
  statValue: {
    color: "#0072ce",
    fontSize: 48,
    margin: "1rem 0px",
    fontWeight: 600,
  },
};

export const DailyDigestEmail = ({
  name,
  event,
  newCrmPersons,
  newFormResponses,
  newEmails,
}) => (
  <Html>
    <Head>
      <Font
        fontFamily="Inter"
        fallbackFontFamily="system-ui"
        webFont={{
          url: "https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fjbvMwCp504jAa1ZL7W0Q5nw.woff2",
          format: "woff2",
        }}
        fontWeight={400}
        fontStyle="normal"
      />
      <Font
        fontFamily="Inter"
        fallbackFontFamily="system-ui"
        webFont={{
          url: "https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fjbvMwCp50PDca1ZL7W0Q5nw.woff2",
          format: "woff2",
        }}
        fontWeight={600}
        fontStyle="semibold"
      />
    </Head>
    <Preview>Your EventPilot daily digest</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Img
          src={"https://geteventpilot.com/static/email-header.png"}
          width="100%"
        />
        <div style={styles.content}>
          <Heading mt={0} as={"h1"} style={styles.heading}>
            Your EventPilot Daily Digest
          </Heading>
          <Text>
            Hi, {name}! Things are happening at {event.name}! Here is a summary
            of what happened in the past 24 hours:
          </Text>

          <Row cellSpacing={4}>
            <Column style={styles.stat}>
              <Text style={styles.statTitle}>New Volunteers</Text>
              <Text style={styles.statValue}>{newFormResponses}</Text>
            </Column>
            <Column style={styles.stat}>
              <Text style={styles.statTitle}>New CRM Persons</Text>
              <Text style={styles.statValue}>{newCrmPersons}</Text>
            </Column>
            <Column style={styles.stat}>
              <Text style={styles.statTitle}>Emails Received</Text>
              <Text style={styles.statValue}>{newEmails}</Text>
            </Column>
          </Row>

          <Text style={styles.or}>
            We value your privacy and security. Please do not reply to this
            email. If you need, you can{" "}
            <Link href="mailto:support@geteventpilot.com">contact us here</Link>
            .
          </Text>
        </div>
      </Container>
    </Body>
  </Html>
);

DailyDigestEmail.PreviewProps = {
  name: "Jack Crane",
  event: {
    name: "Ohio River Paddlefest",
  },
  newFormResponses: 2,
  newCrmPersons: 7,
  newEmails: 10,
};

export default DailyDigestEmail;
