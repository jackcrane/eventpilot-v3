import styles from "./databox.module.css";
import { Typography } from "tabler-react-2";
import classNames from "classnames";
import { Icon } from "../../util/Icon";

export const DataBox = ({ title, description, value, trend = null }) => {
  return (
    <div className={styles.dataBox}>
      <div className={styles.dataBoxHeader}>
        <Typography.H5 className={"mb-0 text-secondary"}>{title}</Typography.H5>
        <Typography.Text className={classNames("mb-0", styles.value)}>
          {value}
        </Typography.Text>
      </div>
      {!!trend && (
        <div className={styles.dataBoxTrend}>
          <Icon
            i={Number(trend?.delta ?? 0) >= 0 ? "trending-up" : "trending-down"}
            color={
              Number(trend?.delta ?? 0) >= 0
                ? "var(--tblr-success)"
                : "var(--tblr-danger)"
            }
            size={16}
          />
          <Typography.Text className="mb-0">
            {trend?.percentChange != null
              ? `${trend.percentChange.toFixed(1)}%`
              : "—"}{" "}
            vs last ({Number(trend?.previousAsOf ?? 0)})
          </Typography.Text>
        </div>
      )}
      {description && (
        <div className={styles.dataBoxDescription}>
          <Typography.Text>{description}</Typography.Text>
        </div>
      )}
    </div>
  );
};
