import React from "react";
import { Heading, Hr, Link, Text } from "@react-email/components";
import { Email } from "../components/Email";

const styles = {
  heading: {
    fontWeight: 600,
    marginTop: 0,
    marginBottom: "1.25rem",
  },
  section: {
    display: "grid",
    gap: "1rem",
    fontSize: "15px",
    lineHeight: "22px",
    color: "#2f3a4a",
  },
  paragraph: {
    margin: 0,
  },
  unsubscribe: {
    color: "#8898aa",
    fontSize: "12px",
    marginTop: "2rem",
  },
};

const renderContentSegments = (segments) => {
  if (!Array.isArray(segments)) return null;

  const normalized = segments
    .map((lines) =>
      Array.isArray(lines)
        ? lines.filter((tokens) => Array.isArray(tokens) && tokens.length)
        : []
    )
    .filter((lines) => lines.length);

  if (!normalized.length) return null;

  return normalized.map((lines, segmentIndex) => (
    <Text key={`segment-${segmentIndex}`} style={styles.paragraph}>
      {lines.map((tokens, lineIndex) => (
        <React.Fragment key={`segment-${segmentIndex}-line-${lineIndex}`}>
          {tokens.map((token, tokenIndex) => {
            if (token?.type === "link" && token.href) {
              return (
                <Link
                  key={`segment-${segmentIndex}-line-${lineIndex}-link-${tokenIndex}`}
                  href={token.href}
                >
                  {token.label || token.href}
                </Link>
              );
            }

            if (token?.value) {
              return (
                <React.Fragment
                  key={`segment-${segmentIndex}-line-${lineIndex}-text-${tokenIndex}`}
                >
                  {token.value}
                </React.Fragment>
              );
            }

            return null;
          })}
          {lineIndex < lines.length - 1 ? <br /> : null}
        </React.Fragment>
      ))}
    </Text>
  ));
};

const resolveHeaderImage = (event) => {
  const banner = event?.banner?.location || event?.bannerUrl;
  if (banner && typeof banner === "string") return banner;
  return "https://geteventpilot.com/static/email-header.png";
};

const resolveLogoImage = (event) => {
  const logo = event?.logo?.location || event?.logoUrl;
  if (logo && typeof logo === "string") return logo;
  return undefined;
};

export const CampaignBlastEmail = ({
  event,
  subject,
  contentSegments,
  unsubscribeUrl,
}) => {
  const content = renderContentSegments(contentSegments);

  return (
    <Email
      headerImage={resolveHeaderImage(event)}
      logoImage={resolveLogoImage(event)}
    >
      {subject ? (
        <Heading as="h1" style={styles.heading}>
          {subject}
        </Heading>
      ) : null}
      {content ? <div style={styles.section}>{content}</div> : null}
      {unsubscribeUrl ? (
        <>
          <Hr />
          <Text style={styles.unsubscribe}>
            Prefer not to receive these emails?{" "}
            <Link href={unsubscribeUrl}>Unsubscribe</Link>.
          </Text>
        </>
      ) : null}
    </Email>
  );
};

CampaignBlastEmail.PreviewProps = {
  subject: "Event Updates",
  contentSegments: [
    [[{ type: "text", value: "Hi there," }]],
    [
      [
        {
          type: "text",
          value:
            "Thanks for being part of our community. Stay tuned for more updates soon!",
        },
      ],
    ],
  ],
  unsubscribeUrl: "https://geteventpilot.com/unsubscribe?p=person123&e=email456",
};

export default CampaignBlastEmail;
