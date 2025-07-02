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
};

export const ForgotPasswordEmail = ({ name, token }) => (
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
    <Preview>Password Reset</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Img
          src={"https://geteventpilot.com/static/email-header.png"}
          width="100%"
        />
        <div style={styles.content}>
          <Heading mt={0} as={"h1"} style={styles.heading}>
            Password Reset
          </Heading>
          <Text>
            Hi, {name}! We are sorry to see you have forgotten your password.
            Please click the button below to reset your password.
          </Text>
          <Button
            as="a"
            href={`https://EventPilot.jackcrane.rocks/api/auth/reset-password?token=${token}`}
            style={styles.button}
          >
            Reset Password
          </Button>
          <Text style={styles.or}>
            We value your privacy and security. Please do not reply to this
            email. If you need, you can{" "}
            <Link href="mailto:support@geteventpilot.com">contact us here</Link>
            . If you did not request a password reset, please ignore this email.
            Your account is secure and your password will not be changed.
          </Text>
        </div>
      </Container>
    </Body>
  </Html>
);

ForgotPasswordEmail.PreviewProps = {
  name: "Jack Crane",
  token: "1234567890",
};

export default ForgotPasswordEmail;
