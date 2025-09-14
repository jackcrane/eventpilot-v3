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
  /** NEW (optional): tabs in the left panel: [{ title, content, icon }] */
  leftTabs,
  /** Optional fixed width for left sidebar (e.g., 320 or '340px') */
  leftWidth,
  /** Optional max-width for left sidebar if not using leftWidth */
  leftMaxWidth,
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
  /** NEW (optional): tabs in the right panel: [{ title, content, icon }] */
  rightTabs,
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

  // Left/right panel tab state
  const hasLeftTabs = Array.isArray(leftTabs) && leftTabs.length > 0;
  const hasRightTabs = Array.isArray(rightTabs) && rightTabs.length > 0;
  const [leftActiveIndex, setLeftActiveIndex] = useState(0);
  const [rightActiveIndex, setRightActiveIndex] = useState(0);

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

  // Active left content (tabs or legacy)
  const renderLeftContent = () => {
    if (hasLeftTabs) {
      const active =
        leftTabs[Math.max(0, Math.min(leftActiveIndex, leftTabs.length - 1))];
      return active?.content ?? null;
    }
    return leftChildren;
  };

  // Active right content (tabs or legacy)
  const renderRightContent = () => {
    if (hasRightTabs) {
      const active =
        rightTabs[
          Math.max(0, Math.min(rightActiveIndex, rightTabs.length - 1))
        ];
      return active?.content ?? null;
    }
    return rightChildren;
  };

  return (
    <div className={styles.container}>
      {!isMobile && !leftCollapsed && (
        <div
          className={classNames(styles.sidebar, styles.sidebarLeft)}
          style={
            leftWidth || leftMaxWidth
              ? {
                  flex: "0 0 auto",
                  flexBasis:
                    typeof leftWidth === "number" ? `${leftWidth}px` : leftWidth,
                  maxWidth:
                    typeof (leftMaxWidth || leftWidth) === "number"
                      ? `${leftMaxWidth || leftWidth}px`
                      : leftMaxWidth || leftWidth,
                }
              : undefined
          }
        >
          {hasLeftTabs ? (
            <div className={styles.tabs}>
              {leftTabs.map((t, idx) => (
                <button
                  key={`${t.title}-${idx}`}
                  type="button"
                  onClick={() => setLeftActiveIndex(idx)}
                  className={classNames(
                    styles.tabButton,
                    idx === leftActiveIndex && styles.tabButtonActive
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
            <div className={styles.title}>
              <Row gap={1}>
                <Icon i={leftIcon} size={18} />
                <Typography.H3 className="mb-0">{leftTitle}</Typography.H3>
              </Row>
            </div>
          )}
          <div className={styles.content}>{renderLeftContent()}</div>
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
                {sideActiveTab === "left" ? (
                  hasLeftTabs ? (
                    <>
                      <div className={styles.tabs}>
                        {leftTabs.map((t, idx) => (
                          <button
                            key={`${t.title}-${idx}`}
                            type="button"
                            onClick={() => setLeftActiveIndex(idx)}
                            className={classNames(
                              styles.tabButton,
                              idx === leftActiveIndex && styles.tabButtonActive
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
                      {renderLeftContent()}
                    </>
                  ) : (
                    leftChildren
                  )
                ) : hasRightTabs ? (
                  <>
                    <div className={styles.tabs}>
                      {rightTabs.map((t, idx) => (
                        <button
                          key={`${t.title}-${idx}`}
                          type="button"
                          onClick={() => setRightActiveIndex(idx)}
                          className={classNames(
                            styles.tabButton,
                            idx === rightActiveIndex && styles.tabButtonActive
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
                    {renderRightContent()}
                  </>
                ) : (
                  rightChildren
                )}
              </div>
            </>
          ) : (
            <>
              {hasRightTabs ? (
                <div className={styles.tabs}>
                  {rightTabs.map((t, idx) => (
                    <button
                      key={`${t.title}-${idx}`}
                      type="button"
                      onClick={() => setRightActiveIndex(idx)}
                      className={classNames(
                        styles.tabButton,
                        idx === rightActiveIndex && styles.tabButtonActive
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
                <div className={styles.title}>
                  <Row gap={1}>
                    <Icon i={rightIcon} size={18} />
                    <Typography.H3 className="mb-0">{rightTitle}</Typography.H3>
                  </Row>
                </div>
              )}
              <div className={styles.content}>{renderRightContent()}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
