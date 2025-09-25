import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { Email } from "../components/Email";

const styles = {
  heading: { fontWeight: 600, marginTop: 0 },
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
  <Email
    preview={`New waitlist signup: ${name}`}
    bodyStyle={{ backgroundColor: "#ffffff" }}
  >
    <Heading as="h1" style={styles.heading}>
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
  </Email>
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
