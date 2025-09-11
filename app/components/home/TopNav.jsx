import { Link } from "react-router-dom";
import { Row } from "../../util/Flex";
import styles from "./home.module.css";
import { Section } from "./Section";
import { Typography } from "tabler-react-2";

export const TopNav = () => {
  return (
    <div className={styles.topNavContainer}>
      <Section>
        <div className={styles.topNav}>
          <Row justify="space-between" align="center" style={{ flex: 1 }}>
            <Typography.H3 className={"mb-0"}>
              Introducing EventPilot
            </Typography.H3>
            <Link to="/waitlist" className={styles.waitlistButton}>
              Join the waitlist for early access →
            </Link>
          </Row>
        </div>
      </Section>
    </div>
  );
};
