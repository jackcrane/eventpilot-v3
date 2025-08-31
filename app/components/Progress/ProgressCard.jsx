import { Card } from "tabler-react-2";
import styles from "./ProgressCard.module.css";
import { Icon } from "../../util/Icon";

export const ProgressCard = ({ title, children, icon, color }) => {
  return (
    <div className={styles.outerCard}>
      <div className={styles.container}>
        <Card title={title} style={{ width: "100%", height: "100%" }}>
          <div className={styles.content}>{children}</div>
        </Card>
        <div className={styles.icon}>
          <Icon i={icon} size={256} color={color} />
        </div>
      </div>
    </div>
  );
};
