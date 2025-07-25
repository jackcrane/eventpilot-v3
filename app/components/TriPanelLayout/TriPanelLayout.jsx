import React, { useState } from "react";
import { Typography, Button } from "tabler-react-2";
import classNames from "classnames";
import { Row } from "../../util/Flex";
import { Icon } from "../../util/Icon";
import styles from "./TriPanelLayout.module.css";

export const TriPanelLayout = ({
  leftIcon,
  leftTitle,
  leftChildren,
  centerIcon,
  centerTitle,
  centerChildren,
  centerClassName,
  centerContentClassName,
  centerContentProps,
  rightIcon,
  rightTitle,
  rightChildren,
}) => {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <div className={styles.container}>
      {!leftCollapsed && (
        <div className={classNames(styles.sidebar, styles.sidebarLeft)}>
          <div className={styles.title}>
            <Row gap={1}>
              <Icon i={leftIcon} size={18} />
              <Typography.H3 className="mb-0">{leftTitle}</Typography.H3>
            </Row>
          </div>
          <div className={styles.content}>{leftChildren}</div>
        </div>
      )}

      <div className={classNames(styles.center, centerClassName)}>
        <div className={styles.title}>
          <Button
            size="sm"
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            className={classNames(
              styles.collapseLeft,
              leftCollapsed && styles.collapsed
            )}
          >
            <Icon
              i={
                leftCollapsed
                  ? "layout-sidebar-left-expand"
                  : "layout-sidebar-left-collapse"
              }
              size={16}
            />
          </Button>

          <Row gap={1}>
            <Icon i={centerIcon} size={18} />
            <Typography.H3 className="mb-0">{centerTitle}</Typography.H3>
          </Row>

          <Button
            size="sm"
            onClick={() => setRightCollapsed(!rightCollapsed)}
            className={classNames(
              styles.collapseRight,
              rightCollapsed && styles.collapsed
            )}
          >
            <Icon
              i={
                rightCollapsed
                  ? "layout-sidebar-right-expand"
                  : "layout-sidebar-right-collapse"
              }
              size={16}
            />
          </Button>
        </div>
        <div className={centerContentClassName} {...centerContentProps}>
          {centerChildren}
        </div>
      </div>

      {!rightCollapsed && (
        <div className={classNames(styles.sidebar, styles.right)}>
          <div className={styles.title}>
            <Row gap={1}>
              <Icon i={rightIcon} size={18} />
              <Typography.H3 className="mb-0">{rightTitle}</Typography.H3>
            </Row>
          </div>
          <div className={styles.content}>{rightChildren}</div>
        </div>
      )}
    </div>
  );
};
