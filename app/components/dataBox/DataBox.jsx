import styles from "./databox.module.css";
import { Typography } from "tabler-react-2";
import { Row } from "../../util/Flex";
import classNames from "classnames";

export const DataBox = ({ title, description, value }) => {
  return (
    <div className={styles.dataBox}>
      <div className={styles.dataBoxHeader}>
        <Typography.H5 className={"mb-0 text-secondary"}>{title}</Typography.H5>
        <Typography.Text className={classNames("mb-0", styles.value)}>
          {value}
        </Typography.Text>
      </div>
      {description && (
        <div className={styles.dataBoxDescription}>
          <Typography.Text>{description}</Typography.Text>
        </div>
      )}
    </div>
  );
};
