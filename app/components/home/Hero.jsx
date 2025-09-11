import { Row } from "../../util/Flex";
import { Section } from "./Section";
import logo from "../../assets/logotype.png";
import styles from "./home.module.css";
import { HeroNav } from "./HeroNav";

export const Hero = () => {
  return (
    <Section>
      <Row align="center" justify="space-between" className={styles.heroRow}>
        <img src={logo} alt="EventPilot Logo" className={styles.heroImage} />
        <HeroNav />
      </Row>
    </Section>
  );
};
