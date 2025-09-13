import { Row } from "../../util/Flex";
import { Icon } from "../../util/Icon";
import styles from "./home.module.css";

const ThatsMeItem = ({ i, text }) => (
  <Row
    gap={1}
    align="center"
    style={{
      backgroundColor: "var(--tblr-gray-200)",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: 18,
    }}
  >
    <Icon i={i} size={28} />
    {text}
  </Row>
);

export const ThatsMeSection = () => (
  <div>
    <Row gap={1} align="center" wrap className="mb-4">
      <ThatsMeItem i="run" text="Marathons" />
      <ThatsMeItem i="kayak" text="Paddle events" />
      <ThatsMeItem i="podium" text="Conferences" />
      <ThatsMeItem i="trophy" text="Competitions" />
      <ThatsMeItem i="building-church" text="Church festivals" />
      <ThatsMeItem i="hand-love-you" text="Concerts" />
      <ThatsMeItem i="gift" text="Fundraisers" />
      <ThatsMeItem i="tie" text="Galas" />
      <ThatsMeItem i="confetti" text="Festivals" />

      <ThatsMeItem i="ticket" text="And everything in between" />
    </Row>
    <a href="/waitlist" className={styles.heroCta}>
      Wait... thats me!
      <Icon i="arrow-right" className={styles.icon} size={16} />
    </a>
  </div>
);
