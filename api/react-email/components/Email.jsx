// components/Email.jsx
import React from "react";
import {
  Body,
  Container,
  Font,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from "@react-email/components";

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
  headerImg: {
    width: "100%",
    maxHeight: "175px",
    objectFit: "cover",
  },
  footer: {
    color: "#8898aa",
    fontSize: "12px",
    lineHeight: "16px",
    padding: "20px",
    margin: 0,
    paddingTop: 0,
  },
  logoImg: {
    width: "100px",
    maxHeight: "100px",
    objectFit: "cover",
    margin: 20,
    marginTop: -50,
    marginBottom: 0,
    borderRadius: "6px",
    outline: "4px solid white",
  },
};

export const Email = ({
  preview,
  children,
  headerImage = "https://geteventpilot.com/static/email-header.png",
  logoImage,
  bodyStyle,
  containerStyle,
  contentStyle,
  footer,
  hideFooter = false,
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
    {preview ? <Preview>{preview}</Preview> : null}
    <Body style={{ ...styles.main, ...bodyStyle }}>
      <Container style={{ ...styles.container, ...containerStyle }}>
        <Img src={headerImage} width="100%" style={styles.headerImg} />
        {logoImage && (
          <Img src={logoImage} width="100%" style={styles.logoImg} />
        )}
        <div style={{ ...styles.content, ...contentStyle }}>{children}</div>
        {!hideFooter &&
          (footer ?? (
            <Text style={styles.footer}>
              We value your privacy and security. Please do not reply to this
              email. If you need, you can{" "}
              <Link href="mailto:support@geteventpilot.com">
                contact us here
              </Link>
              .
            </Text>
          ))}
      </Container>
    </Body>
  </Html>
);
