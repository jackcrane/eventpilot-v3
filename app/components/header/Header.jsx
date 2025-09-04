import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import styles from "./Header.module.css";
import { Dropdown } from "tabler-react-2/dist/dropdown";
import { Typography, Button } from "tabler-react-2";
import { Icon } from "../../util/Icon";
const IconLogout = () => <Icon i={"logout"} size={18} />;
const IconLogin2 = () => <Icon i={"login-2"} size={18} />;
const IconSettings = () => <Icon i={"settings"} size={18} />;
import logo from "../../assets/logotype.svg";
import icon from "../../assets/ico.png";
import { Link, useLocation, useMatches, useNavigate } from "react-router-dom";
import { EventPicker } from "../eventPicker/EventPicker";
import { useParsedUrl } from "../../hooks/useParsedUrl";
import { StripeTrigger } from "../stripe/Stripe";
import { HideWhenSmaller, ShowWhenSmaller } from "../media/Media";
import toast from "react-hot-toast";
import { InstancePicker } from "../InstancePicker/InstancePicker";
import { Row } from "../../util/Flex";

export const Header = ({
  setMobileNavOpen,
  mobileNavOpen,
  showPicker = true,
}) => {
  const { user, loggedIn, login, logout, resendVerificationEmail } = useAuth();
  const { navigate } = useNavigate();
  const url = useParsedUrl(window.location.pathname);

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
      {/* Account-level payment standing banner removed; billing is event-scoped. */}
      <header className={styles.header}>
        <div className={styles.headerGroup}>
          <ShowWhenSmaller w={500}>
            <Button onClick={() => setMobileNavOpen(!mobileNavOpen)}>
              <Icon i="menu" />
            </Button>
          </ShowWhenSmaller>
          <Link to="/">
            <img src={icon} className={styles.headerLogo} alt="Logo" />
          </Link>
          <HideWhenSmaller w={500}>
            <Breadcrumbs showPicker={showPicker} />
          </HideWhenSmaller>
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
                  import.meta.env.MODE === "development" && {
                    text: "Copy token",
                    onclick: () => {
                      const token = localStorage.getItem("token");
                      navigator.clipboard.writeText(token);
                      toast.success("Copied to clipboard");
                    },
                    type: "item",
                    icon: <Icon i="copy" />,
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
                ].filter(Boolean)
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

const Breadcrumbs = ({ showPicker = true }) => {
  const { loggedIn } = useAuth();
  const url = useParsedUrl(window.location.pathname);

  if (!loggedIn) return null;

  const builder = [];
  if (url.events && showPicker) {
    builder.push(
      <EventPicker go value={url.events} className="tour__event-picker" />
    );
  }
  if (url.events && typeof url.events === "string") {
    builder.push(
      <InstancePicker eventId={url.events} className="tour__instance-picker" />
    );
  }

  return (
    <Row gap={1} align="center">
      {builder.map((item, index) => (
        <>{item}</>
      ))}
    </Row>
  );
};
