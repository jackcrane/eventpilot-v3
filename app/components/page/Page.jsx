import { Header } from "../header/Header";
import { useTitle, useWindowSize } from "react-use";
import styled from "styled-components";
import { Sidenav } from "../sidenav/Sidenav";
import { Footer } from "../footer/Footer";
import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

function Fallback({ error, resetErrorBoundary }) {
  // Call resetErrorBoundary() to reset the error boundary and retry the render.

  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre
        style={{
          color: "red",
          width: "calc(100% - 20px)",
          wordWrap: "break-word",
          whiteSpace: "pre-wrap",
          margin: "10px",
        }}
      >
        {error.message}
      </pre>
      <pre
        style={{
          color: "red",
          width: "calc(100% - 20px)",
          wordWrap: "break-word",
          whiteSpace: "pre-wrap",
          margin: "10px",
        }}
      >
        {error.stack}
      </pre>
    </div>
  );
}

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
    <ErrorBoundary fallbackRender={Fallback}>
      <Header
        showPicker={showPicker}
        setMobileNavOpen={setMobileNavOpen}
        mobileNavOpen={mobileNavOpen}
      />
      {/* <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          borderBottom: "2px solid var(--tblr-border-color)",
          padding: 10,
        }}
      ></div> */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          // minHeight: "calc(100dvh - 70px)",
          gap: width < 500 ? 0 : 10,
          padding: padding ? 10 : 0,
          paddingBottom: 0,
          maxWidth: 1400,
          margin: "auto",
        }}
      >
        {sidenavItems && (
          <Sidenav
            showCollapse={false}
            items={sidenavItems}
            mobileNavOpen={mobileNavOpen}
            setMobileNavOpen={setMobileNavOpen}
          />
        )}
        <div
          style={{
            // width: "100%",
            flex: 1,
            minWidth: 0,
            // overflowX: allowOverflow ?  : "hidden",
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
