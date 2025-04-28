import {
  Body,
  Button,
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

const baseUrl = "";

/** @type {{ main: import("react").CSSProperties }} */
const styles = {
  main: {
    backgroundColor: "#ffffff",
  },
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    border: "1px solid #eee",
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
    userSelect: "none",
    lineHeight: "16px",
    display: "inline-block",
  },
};

export const WelcomeEmail = ({ name, token }) => (
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
    <Preview>Welcome to EventPilot, {name}!</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Img src={`https://cdn.jackcrane.rocks/ski.jpg`} width="100%" />
        <div style={styles.content}>
          <Heading mt={0} as={"h1"} style={styles.heading}>
            Welcome to EventPilot, <b style={{ fontWeight: 600 }}>{name}</b>!
          </Heading>
          <Text>
            You have taken the next step in your journey to improving your
            volunteer and participant experiences. We are so excited to have you
            on board and can't wait to get you started!
          </Text>
          <Text>
            Please click the button below to confirm your email and start your
            EventPilot journey.
          </Text>
          <Button
            as="a"
            href={`https://EventPilot.jackcrane.rocks/verify?verificationtoken=${token}`}
            style={styles.button}
          >
            Confirm Email
          </Button>
          <Text style={styles.or}>
            We verify your email address so we know we can send you emails,
            updates, and other communications. Your private information remains
            private, and is not sold or shared with third parties except as
            required for functionality and interoperability. If you have any
            questions, please refer to our privary policy or contact us.
          </Text>
        </div>
      </Container>
    </Body>
  </Html>
);

WelcomeEmail.PreviewProps = {
  name: "Jack Crane",
  token: "token",
};

export default WelcomeEmail;
