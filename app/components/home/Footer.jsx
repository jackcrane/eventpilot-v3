import { Col } from "../../util/Flex";
import styles from "./footer.module.css";
import logotype from "../../assets/logotype.png";

export const Footer = () => {
  return (
    <footer className={styles.footer}>
      <Col>
        <img src={logotype} alt="EventPilot Logo" style={{ width: 150 }} />
      </Col>
      <Col style={{ maxWidth: 500 }}>
        Arming event teams with state-of-the-art tools to better understand,
        manage, grow, and optimize their events.
      </Col>
    </footer>
  );
};
