import { Column, Heading, Row, Text } from "@react-email/components";
import * as React from "react";
import { Email } from "../components/Email";

const styles = {
  heading: {
    fontWeight: 400,
    marginTop: 0,
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
  <Email preview="Your EventPilot daily digest">
    <Heading as="h1" style={styles.heading}>
      Your EventPilot Daily Digest
    </Heading>
    <Text>
      Hi, {name}! Things are happening at {event.name}! Here is a summary of
      what happened in the past 24 hours:
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
  </Email>
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
