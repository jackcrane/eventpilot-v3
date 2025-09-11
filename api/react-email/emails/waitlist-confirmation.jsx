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

const styles = {
  main: { backgroundColor: "#ffffff" },
  container: { maxWidth: "600px", margin: "0 auto", border: "1px solid #eee" },
  content: { padding: "20px" },
  heading: { fontWeight: 600 },
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
    <Preview>You're on the EventPilot waitlist, {name}!</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Img src={"https://geteventpilot.com/static/email-header.png"} width="100%" />
        <div style={styles.content}>
          <Heading as="h1" style={styles.heading}>
            You’re on the list, {name}!
          </Heading>
          <Text>
            Thanks for your interest in EventPilot. We’ll reach out when we’re
            ready to bring you into early access.
          </Text>
          <Text>
            In the meantime, you can learn more about EventPilot on our site.
          </Text>
          <Button
            as="a"
            href="https://geteventpilot.com"
            style={styles.button}
          >
            Visit website
          </Button>
        </div>
      </Container>
    </Body>
  </Html>
);

WaitlistConfirmationEmail.PreviewProps = {
  name: "Jane",
};

export default WaitlistConfirmationEmail;

