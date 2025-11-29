import React, { useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import styles from "./Header.module.css";
import { Dropdown } from "tabler-react-2/dist/dropdown";
import { Typography, Button } from "tabler-react-2";
import { Icon } from "../../util/Icon";
const IconLogout = () => <Icon i={"logout"} size={18} />;
const IconLogin2 = () => <Icon i={"login-2"} size={18} />;
const IconSettings = () => <Icon i={"settings"} size={18} />;
import icon from "../../assets/ico.png";
import { Link } from "react-router-dom";
import { EventPicker } from "../eventPicker/EventPicker";
import { useParsedUrl } from "../../hooks/useParsedUrl";
import { HideWhenSmaller, ShowWhenSmaller } from "../media/Media";
import toast from "react-hot-toast";
import { InstancePicker } from "../InstancePicker/InstancePicker";
import { Row } from "../../util/Flex";
import { UniversalSearch } from "../UniversalSearch/UniversalSearch";

export const Header = ({
  setMobileNavOpen,
  mobileNavOpen,
  showPicker = true,
}) => {
  const { user, loggedIn, logout, resendVerificationEmail } = useAuth();
  const url = useParsedUrl(window.location.pathname);

  const currentEventId = useMemo(() => {
    if (!url?.events) return null;
    if (typeof url.events === "string") {
      return url.events;
    }
    if (Array.isArray(url.events)) {
      return url.events[0] ?? null;
    }
    return null;
  }, [url?.events]);

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
        <div className={styles.headerActions}>
          {currentEventId && (
            <div className={styles.headerSearch}>
              <UniversalSearch
                eventId={currentEventId}
                onResultSelected={(result) =>
                  console.debug("Search result selected", result)
                }
              />
            </div>
          )}
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
        </div>
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
