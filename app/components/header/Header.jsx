import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import styles from "./Header.module.css";
import { Dropdown } from "tabler-react-2/dist/dropdown";
import { Typography } from "tabler-react-2";
import { Icon } from "../../util/Icon";
const IconLogout = () => <Icon i={"logout"} size={18} />;
const IconLogin2 = () => <Icon i={"login-2"} size={18} />;
const IconSettings = () => <Icon i={"settings"} size={18} />;
import logo from "../../assets/logotype.svg";
import icon from "../../assets/ico.png";
import { Link, useLocation, useMatches, useNavigate } from "react-router-dom";

export const Header = () => {
  const { user, loggedIn, login, logout, resendVerificationEmail } = useAuth();
  const { navigate } = useNavigate();

  return (
    <>
      {loggedIn && !user?.emailVerified && (
        <div className={"bg-red text-white"} style={{ padding: "5px 10px" }}>
          Your email is not verified. Please click the link in your email to
          verify your email address. If you don't see the email, you can{" "}
          <Typography.Link
            href="#"
            onClick={() => resendVerificationEmail({ email: user.email })}
            style={{ color: "white", textDecoration: "underline" }}
          >
            resend the verification email
          </Typography.Link>
          . You will not be able to log in until you verify your email.
        </div>
      )}
      <header className={styles.header}>
        <div className={styles.headerGroup}>
          <img src={icon} className={styles.headerLogo} alt="Logo" />
          <Breadcrumbs />
        </div>
        <Dropdown
          prompt={loggedIn ? user?.name : "Account"}
          items={
            loggedIn
              ? [
                  {
                    text: "Account Settings",
                    href: "/me",
                    type: "item",
                    icon: <IconSettings />,
                  },
                  {
                    type: "divider",
                  },
                  {
                    text: "Log Out",
                    onclick: logout,
                    type: "item",
                    icon: <IconLogout />,
                  },
                ]
              : [
                  {
                    text: "Log In",
                    onclick: () => (document.location.href = "/login"),
                    type: "item",
                    icon: <IconLogin2 />,
                  },
                ]
          }
        />
      </header>
    </>
  );
};

const Breadcrumbs = () => {
  const location = useLocation();
};
