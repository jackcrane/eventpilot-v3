import {
  Body,
  Container,
  Font,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from "@react-email/components";
import * as React from "react";

const styles = {
  main: { backgroundColor: "#ffffff" },
  container: { maxWidth: "600px", margin: "0 auto", border: "1px solid #eee" },
  content: { padding: "20px" },
  row: { marginBottom: 8 },
  label: { color: "#667085" },
  value: { color: "#111827", fontWeight: 600 },
};

export const WaitlistNotificationEmail = ({
  name,
  email,
  organization,
  website,
  message,
  eventSize,
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
    <Preview>New waitlist signup: {name}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Img src={"https://geteventpilot.com/static/email-header.png"} width="100%" />
        <div style={styles.content}>
          <Heading as="h1" style={{ fontWeight: 600, marginTop: 0 }}>
            New waitlist signup
          </Heading>
          <div style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{name}</Text>
          </div>
          <div style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{email}</Text>
          </div>
          {organization ? (
            <div style={styles.row}>
              <Text style={styles.label}>Organization</Text>
              <Text style={styles.value}>{organization}</Text>
            </div>
          ) : null}
          {website ? (
            <div style={styles.row}>
              <Text style={styles.label}>Website</Text>
              <Text style={styles.value}>{website}</Text>
            </div>
          ) : null}
          <div style={styles.row}>
            <Text style={styles.label}>Estimated participants</Text>
            <Text style={styles.value}>{eventSize?.toLocaleString?.() ?? eventSize}</Text>
          </div>
          {message ? (
            <div style={{ ...styles.row, marginTop: 16 }}>
              <Text style={styles.label}>Message</Text>
              <Text style={styles.value}>{message}</Text>
            </div>
          ) : null}
        </div>
      </Container>
    </Body>
  </Html>
);

WaitlistNotificationEmail.PreviewProps = {
  name: "Jane Doe",
  email: "jane@example.com",
  organization: "Acme Events",
  website: "https://acme.events",
  message: "We're planning a city marathon.",
  eventSize: 1200,
};

export default WaitlistNotificationEmail;

