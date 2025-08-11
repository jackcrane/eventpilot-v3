import { Header } from "../header/Header";
import { useTitle, useWindowSize } from "react-use";
import { Sidenav } from "../sidenav/Sidenav";
import { Footer } from "../footer/Footer";
import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useSelectedInstance } from "../../contexts/SelectedInstanceContext";

function Fallback({ error }) {
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
  const { instance } = useSelectedInstance();

  const instanceIsInPast = new Date(instance?.endTime) < new Date();

  return (
    <ErrorBoundary fallbackRender={Fallback}>
      {instanceIsInPast && (
        <div
          className={"bg-orange text-white"}
          style={{ padding: "5px 10px", fontWeight: "bold" }}
        >
          You are looking at historical data. You can still view and modify your
          event, but you will be making changes to past events.
        </div>
      )}
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
