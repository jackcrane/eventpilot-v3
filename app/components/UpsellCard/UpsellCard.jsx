import { Card, Typography } from "tabler-react-2";
import styles from "./upsellCard.module.css";
import classNames from "classnames";

const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const UpsellCard = ({ upsell }) => {
  return (
    <div className={classNames(styles.container)}>
      <div
        className={classNames(
          styles.image,
          upsell.image?.location || styles[`gradient${random(1, 10)}`]
        )}
      />
      <div className={styles.content}>
        <Typography.H3 className="mb-0">{upsell.name}</Typography.H3>
      </div>
    </div>
  );
};
