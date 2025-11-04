import React, { useEffect, useState } from "react";
import styles from "./sidenav.module.css";
import { Button } from "tabler-react-2/dist/button";
import { Util } from "tabler-react-2";
import { Icon } from "../../util/Icon";
import { Row } from "../../util/Flex";
import { useWindowSize } from "react-use";
import classNames from "classnames";

export const sidenavItems = (activeText) => {
  const items = [
    {
      type: "item",
      href: `/`,
      text: `Home`,
      active: activeText === "home",
      icon: <Icon i="home" size={18} />,
    },
    {
      type: "divider",
    },
    {
      type: "item",
      href: `/me`,
      text: `Profile`,
      active: activeText === "profile",
      icon: <Icon i="settings" size={18} />,
    },
    // Example dropdown:
    // {
    //   type: "dropdown",
    //   text: "Settings",
    //   icon: <Icon i="settings" size={18} />,
    //   children: [
    //     { type: "item", href: "/settings/profile", text: "Profile", active: activeText === "profile" },
    //     { type: "item", href: "/settings/account", text: "Account", active: activeText === "account" },
    //   ]
    // },
  ];
  return items;
};

export const Sidenav = ({
  items,
  mobileNavOpen,
  setMobileNavOpen,
  showCollapse = true,
  ...props
}) => {
  const { width } = useWindowSize();
  const [collapsed, setCollapsed] = useState(
    localStorage.getItem("collapsed") === "true" && width > 500
  );
  const [openDropdowns, setOpenDropdowns] = useState({});

  // auto-open dropdowns containing an active child on mount
  useEffect(() => {
    setOpenDropdowns((prev) => {
      const next = {};

      items.forEach((item, idx) => {
        const wasOpen = prev[idx];
        const hasActiveChild =
          item.type === "dropdown" &&
          Array.isArray(item.children) &&
          item.children.some((child) => child.active);

        if (hasActiveChild) {
          next[idx] = true;
        } else if (wasOpen) {
          next[idx] = true;
        }
      });

      return next;
    });
  }, [items]);

  useEffect(() => {
    if (width < 500) {
      setCollapsed(false);
    }
  }, [width]);

  const collapse = () => {
    if (width < 500) {
      setCollapsed(false);
      return;
    }
    const next = !collapsed;
    localStorage.setItem("collapsed", next);
    setCollapsed(next);
  };

  const toggleDropdown = (idx) => {
    setOpenDropdowns((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className={styles.container}>
      <div
        className={classNames(styles.shade, mobileNavOpen && styles.open)}
        onClick={() => setMobileNavOpen(false)}
      />
      <nav
        className={classNames(styles.sidenav, mobileNavOpen && styles.open)}
        style={{
          width: collapsed ? 50 : 200,
          transition: "width 0.2s",
          ...props.style,
        }}
      >
        {items.map((item, index) => {
          if (item.type === "divider") {
            return <Util.Hr key={index} style={{ margin: 0 }} />;
          }

          if (item.type === "dropdown" && Array.isArray(item.children)) {
            const isOpen = openDropdowns[index];
            const hasActiveChild = item.children.some((c) => c.active);

            return (
              <React.Fragment key={index}>
                <Button
                  onClick={() => toggleDropdown(index)}
                  ghost
                  variant={hasActiveChild ? "primary" : "secondary"}
                  outline={hasActiveChild}
                  className={classNames(
                    hasActiveChild && "bg-gray-200",
                    styles.btn
                  )}
                >
                  <Row
                    gap={1}
                    justify="space-between"
                    style={{ width: "100%" }}
                  >
                    <Row gap={1}>
                      {item.icon}
                      {!collapsed && item.text}
                    </Row>
                    <Icon
                      i={isOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                    />
                  </Row>
                </Button>
                {isOpen && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      marginLeft: collapsed ? 0 : 10,
                      paddingLeft: collapsed ? 0 : 10,
                      gap: 4,
                      borderLeft: "2px solid var(--tblr-gray-200)",
                    }}
                  >
                    {item.children.map((child, cIdx) =>
                      child.type === "divider" ? (
                        <Util.Hr key={`${index}-${cIdx}`} />
                      ) : (
                        <Button
                          key={`${index}-${cIdx}`}
                          href={child.href}
                          variant={child.active ? "primary" : "secondary"}
                          outline={child.active}
                          target={child.target}
                          ghost
                          className={classNames(
                            child.active && "bg-gray-200",
                            styles.btn
                          )}
                        >
                          <Row gap={1} style={{ width: "100%" }}>
                            {child.icon}
                            {!collapsed && child.text}
                          </Row>
                        </Button>
                      )
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          }

          // regular item
          return (
            <Button
              key={index}
              href={item.href || undefined}
              onClick={item.onClick || undefined}
              target={item.target}
              variant={item.active ? "primary" : "secondary"}
              outline={item.active}
              ghost
              className={classNames(item.active && "bg-gray-200", styles.btn)}
            >
              <Row gap={1} style={{ width: "100%" }}>
                {item.icon}
                {!collapsed && item.text}
                <div style={{ flex: 1 }} />
                {item.accessoryIcon}
              </Row>
            </Button>
          );
        })}

        <div style={{ flex: 1 }} />

        {width > 500 ? (
          showCollapse && (
            <Button onClick={collapse}>
              <Icon
                i={collapsed ? "chevron-right" : "chevron-left"}
                size={18}
              />
              {!collapsed && "Collapse"}
            </Button>
          )
        ) : (
          <Button onClick={() => setMobileNavOpen(false)}>
            <Icon i="menu" size={18} />
            Close
          </Button>
        )}

        <div style={{ height: 20 }} />
      </nav>
    </div>
  );
};
