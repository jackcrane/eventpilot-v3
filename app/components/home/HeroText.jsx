import { Typography } from "tabler-react-2";
import styles from "./home.module.css";
import { Section } from "./Section";
import classNames from "classnames";
import { Icon } from "../../util/Icon";

export const HeroText = () => {
  return (
    <Section>
      <div className={styles.heroText}>
        <Typography.H1
          style={{
            maxWidth: 600,
            fontSize: "4rem",
            lineHeight: "0.9",
            fontWeight: 700,
            letterSpacing: -2,
            color: "black",
          }}
          className="mb-4"
        >
          Simplifying event management for every organizer
        </Typography.H1>
        <Typography.H2 style={{ maxWidth: 600 }}>
          EventPilot gives you the tools to manage, understand, and optimize
          your event from start to finish.
        </Typography.H2>
        <a href="/waitlist" className={styles.heroCta}>
          Join the waitlist
          <Icon i="arrow-right" className={styles.icon} size={16} />
        </a>
      </div>
    </Section>
  );
};
