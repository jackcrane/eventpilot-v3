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
  ];
  console.log(items);
  return items;
};

export const Sidenav = ({
  items,
  mobileNavOpen,
  setMobileNavOpen,
  ...props
}) => {
  const { width } = useWindowSize();
  const [collapsed, setCollapsed] = useState(
    localStorage.getItem("collapsed") === "true" && width > 500
  );

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
    const newCollapsed = !collapsed;
    localStorage.setItem("collapsed", newCollapsed);
    setCollapsed(newCollapsed);
  };

  // return <Link to="/sdf">sdf</Link>;

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
        {items.map((item, index) =>
          item.type === "divider" ? (
            <Util.Hr key={index} style={{ margin: "8px 0" }} />
          ) : (
            <Button
              href={item.href}
              variant={item.active && "primary"}
              outline={item.active}
              key={index}
            >
              <Row gap={1} justify="space-between">
                {item.icon && item.icon}
                {!collapsed && item.text}
              </Row>
            </Button>
          )
        )}
        <div style={{ flex: 1 }} />
        {width > 500 ? (
          <Button onClick={collapse}>
            <Icon i={collapsed ? "chevron-right" : "chevron-left"} size={18} />
            {collapsed ? "" : "Collapse"}
          </Button>
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
