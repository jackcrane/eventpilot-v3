// TriPanelLayout.jsx
import React, { useState, useEffect } from "react";
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
  /** NEW (optional): tabs in the center panel: [{ title, content, icon }] */
  centerTabs,
}) => {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 1100 : false
  );

  // Mobile right-panel tab state (left/right stack)
  const [sideActiveTab, setSideActiveTab] = useState("left");

  // Center panel tab state
  const hasCenterTabs = Array.isArray(centerTabs) && centerTabs.length > 0;
  const [centerActiveIndex, setCenterActiveIndex] = useState(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1100);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Active center content (tabs or legacy)
  const renderCenterContent = () => {
    if (hasCenterTabs) {
      const active =
        centerTabs[
          Math.max(0, Math.min(centerActiveIndex, centerTabs.length - 1))
        ];
      return active?.content ?? null;
    }
    return centerChildren;
  };

  return (
    <div className={styles.container}>
      {!isMobile && !leftCollapsed && (
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
        <div
          className={classNames(styles.title, hasCenterTabs && styles.hasTabs)}
        >
          {!isMobile && (
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
          )}

          {hasCenterTabs ? (
            <div className={styles.tabs}>
              {centerTabs.map((t, idx) => (
                <button
                  key={`${t.title}-${idx}`}
                  type="button"
                  onClick={() => setCenterActiveIndex(idx)}
                  className={classNames(
                    styles.tabButton,
                    idx === centerActiveIndex && styles.tabButtonActive
                  )}
                  title={t.title}
                >
                  <Row gap={1} align="center">
                    {t.icon ? <Icon i={t.icon} size={16} /> : null}
                    <Typography.H3 className="mb-0">{t.title}</Typography.H3>
                  </Row>
                </button>
              ))}
            </div>
          ) : (
            <Row gap={1}>
              <Icon i={centerIcon} size={18} />
              <Typography.H3 className="mb-0">{centerTitle}</Typography.H3>
            </Row>
          )}

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
          {renderCenterContent()}
        </div>
      </div>

      {!rightCollapsed && (
        <div className={classNames(styles.sidebar, styles.right)}>
          {isMobile ? (
            <>
              <div className={classNames(styles.tabs)}>
                <button
                  type="button"
                  onClick={() => setSideActiveTab("left")}
                  className={classNames(
                    styles.tabButton,
                    sideActiveTab === "left" && styles.tabButtonActive
                  )}
                >
                  <Row gap={1} align="center">
                    <Icon i={leftIcon} size={16} />
                    <Typography.H3 className="mb-0">{leftTitle}</Typography.H3>
                  </Row>
                </button>
                <button
                  type="button"
                  onClick={() => setSideActiveTab("right")}
                  className={classNames(
                    styles.tabButton,
                    sideActiveTab === "right" && styles.tabButtonActive
                  )}
                >
                  <Row gap={1} align="center">
                    <Icon i={rightIcon} size={16} />
                    <Typography.H3 className="mb-0">{rightTitle}</Typography.H3>
                  </Row>
                </button>
              </div>
              <div className={styles.content}>
                {sideActiveTab === "left" ? leftChildren : rightChildren}
              </div>
            </>
          ) : (
            <>
              <div className={styles.title}>
                <Row gap={1}>
                  <Icon i={rightIcon} size={18} />
                  <Typography.H3 className="mb-0">{rightTitle}</Typography.H3>
                </Row>
              </div>
              <div className={styles.content}>{rightChildren}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
