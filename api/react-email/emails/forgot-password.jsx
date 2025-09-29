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
    color: "#8898aa",
    fontSize: "12px",
    lineHeight: "16px",
    marginTop: "12px",
  },
};

export const ForgotPasswordEmail = ({ name, token }) => (
  <Email preview="Password Reset">
    <Heading as="h1" style={styles.heading}>
      Password Reset
    </Heading>
    <Text>
      Hi, {name}! We are sorry to see you have forgotten your password. Please
      click the button below to reset it.
    </Text>
    <Button
      as="a"
      href={`https://geteventpilot.com/forgot-password?forgottoken=${token}`}
      style={styles.button}
    >
      Reset Password
    </Button>
    <Text style={styles.note}>
      If you did not request a password reset, you can safely ignore this email.
      Your account will remain secure and your password will not be changed.
    </Text>
  </Email>
);

ForgotPasswordEmail.PreviewProps = {
  name: "Jack Crane",
  token: "1234567890",
};

export default ForgotPasswordEmail;
