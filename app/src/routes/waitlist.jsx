import { useState } from "react";
import { Typography, Input, Button } from "tabler-react-2";
import { Icon } from "../../util/Icon";
import { TopNav } from "../../components/home/TopNav";
import { Section } from "../../components/home/Section";
import styles from "../../components/home/home.module.css";
import { useWaitlist } from "../../hooks/useWaitlist";

export const WaitlistPage = () => {
  const { joinWaitlist } = useWaitlist();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [website, setWebsite] = useState("");
  const [message, setMessage] = useState("");
  const [eventSize, setEventSize] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const ok = await joinWaitlist({
      name,
      email,
      organization,
      website,
      message,
      eventSize: eventSize ? parseInt(eventSize, 10) : undefined,
    });
    if (ok) setSubmitted(true);
  };

  return (
    <>
      <TopNav />
      <Section>
        {!submitted && (
          <div className={styles.heroText}>
            <Typography.H1
              style={{
                maxWidth: 600,
                fontSize: "3rem",
                lineHeight: "1",
                fontWeight: 700,
                letterSpacing: -1,
                color: "black",
              }}
              className="mb-4"
            >
              Join the EventPilot waitlist
            </Typography.H1>
            <Typography.H2 style={{ maxWidth: 600 }}>
              Tell us a bit about you and we’ll be in touch with early access.
            </Typography.H2>
          </div>
        )}

        {!submitted && (
          <form
            onSubmit={onSubmit}
            style={{ maxWidth: 600, paddingBottom: 64 }}
          >
            <Input
              required
              label="Name"
              placeholder="Your name"
              value={name}
              onInput={setName}
              className="mb-3"
            />
            <Input
              required
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onInput={setEmail}
              className="mb-3"
            />
            <Input
              required
              type="number"
              label="Estimated participants"
              placeholder="e.g., 500"
              value={eventSize}
              onInput={setEventSize}
              className="mb-3"
              min={1}
            />
            <Input
              label="Organization"
              placeholder="Company or organization"
              value={organization}
              onInput={setOrganization}
              className="mb-3"
            />
            <Input
              label="Website"
              placeholder="https://example.com"
              value={website}
              onInput={setWebsite}
              className="mb-3"
            />
            <Input
              useTextarea
              label="Message (optional)"
              placeholder="What are you organizing? Any context helps."
              value={message}
              onInput={setMessage}
              minRows={4}
              className="mb-3"
            />
            <Button type="submit" className={styles.heroCta}>
              Join the waitlist
              <Icon i="arrow-right" className={styles.icon} size={16} />
            </Button>
          </form>
        )}

        {submitted && (
          <div className={styles.heroText}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: "rgba(var(--tblr-success-rgb), 0.15)",
                color: "var(--tblr-success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Icon i="check" size={28} />
            </div>
            <Typography.H1
              style={{
                maxWidth: 600,
                fontSize: "3rem",
                lineHeight: "1",
                fontWeight: 700,
                letterSpacing: -1,
                color: "black",
              }}
              className="mb-3"
            >
              You're on the list!
            </Typography.H1>
            <Typography.H2 style={{ maxWidth: 640 }}>
              Thanks for your interest. We’ll reach out with early access as
              spots open.
            </Typography.H2>
            <a href="/" className={styles.heroCta} style={{ marginTop: 24 }}>
              Back to homepage
              <Icon i="arrow-right" className={styles.icon} size={16} />
            </a>
          </div>
        )}
      </Section>
    </>
  );
};
