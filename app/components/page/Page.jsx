import { Header } from "../header/Header";
import { useTitle, useWindowSize } from "react-use";
import styled from "styled-components";
import { Sidenav } from "../sidenav/Sidenav";
import { Footer } from "../footer/Footer";
import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

export const Page = ({
  children,
  title,
  sidenavItems,
  allowOverflow = false,
  padding = true,
  showPicker = true,
}) => {
  useTitle(title ? `${title} | EventPilot` : "EventPilot");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { width } = useWindowSize();

  return (
    <ErrorBoundary fallback={<div>Error</div>}>
      <Header
        showPicker={showPicker}
        setMobileNavOpen={setMobileNavOpen}
        mobileNavOpen={mobileNavOpen}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          minHeight: "calc(100dvh - 70px)",
          gap: width < 500 ? 0 : 10,
          padding: padding ? 10 : 0,
          paddingBottom: 0,
          maxWidth: 1400,
          margin: "auto",
        }}
      >
        {sidenavItems && (
          <Sidenav
            items={sidenavItems}
            mobileNavOpen={mobileNavOpen}
            setMobileNavOpen={setMobileNavOpen}
          />
        )}
        <div
          style={{
            width: "100%",
            overflowX: allowOverflow ? "visible" : "hidden",
            padding: padding ? 4 : 0,
            paddingBottom: 100,
          }}
        >
          {children}
        </div>
      </div>
      <Footer />
    </ErrorBoundary>
  );
};
