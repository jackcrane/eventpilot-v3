import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { Email } from "../components/Email";

const styles = {
  heading: { fontWeight: 600, marginTop: 0 },
  button: {
    backgroundColor: "#0072ce",
    color: "#ffffff",
    borderRadius: 5,
    padding: "8px 16px",
    textDecoration: "none",
    border: "none",
    display: "inline-block",
  },
};

export const WaitlistConfirmationEmail = ({ name }) => (
  <Email
    preview={`You're on the EventPilot waitlist, ${name}!`}
    bodyStyle={{ backgroundColor: "#ffffff" }}
  >
    <Heading as="h1" style={styles.heading}>
      You’re on the list, {name}!
    </Heading>
    <Text>
      Thanks for your interest in EventPilot. We’ll reach out when we’re ready
      to bring you into early access.
    </Text>
    <Text>In the meantime, you can learn more about EventPilot on our site.</Text>
    <Button as="a" href="https://geteventpilot.com" style={styles.button}>
      Visit website
    </Button>
  </Email>
);

WaitlistConfirmationEmail.PreviewProps = {
  name: "Jane",
};

export default WaitlistConfirmationEmail;
