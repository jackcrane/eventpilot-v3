import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { Email } from "../components/Email";

const styles = {
  heading: {
    fontWeight: 400,
    marginTop: 0,
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
  note: {
    color: "#667085",
    fontSize: "12px",
    lineHeight: "18px",
    marginTop: "16px",
  },
};

export const WelcomeEmail = ({ name, token }) => (
  <Email
    preview={`Welcome to EventPilot, ${name}!`}
    bodyStyle={{ backgroundColor: "#ffffff" }}
  >
    <Heading as="h1" style={styles.heading}>
      Welcome to EventPilot, <b style={{ fontWeight: 600 }}>{name}</b>!
    </Heading>
    <Text>
      You have taken the next step in your journey to improving your volunteer
      and participant experiences. We are so excited to have you on board and
      cannot wait to get you started!
    </Text>
    <Text>
      Please click the button below to confirm your email and start your
      EventPilot journey.
    </Text>
    <Button
      as="a"
      href={`https://geteventpilot.com/verify?verificationtoken=${token}`}
      style={styles.button}
    >
      Confirm Email
    </Button>
    <Text style={styles.note}>
      We verify your email address so we can send product updates and important
      communications. Your personal information remains private and is only used
      to deliver EventPilot functionality.
    </Text>
  </Email>
);

WelcomeEmail.PreviewProps = {
  name: "Jack Crane",
  token: "token",
};

export default WelcomeEmail;
