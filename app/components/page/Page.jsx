import { Header } from "../header/Header";
import { useTitle } from "react-use";
import styled from "styled-components";
import { Sidenav } from "../sidenav/Sidenav";

export const Page = ({ children, title, sidenavItems }) => {
  useTitle(title ? `${title} | EventPilot` : "EventPilot");

  return (
    <>
      <Header />
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          minHeight: "calc(100dvh - 70px)",
          gap: 10,
          padding: 10,
          paddingBottom: 0,
          maxWidth: 1400,
          margin: "auto",
        }}
      >
        {sidenavItems && <Sidenav items={sidenavItems} />}
        <div
          style={{
            width: "100%",
            overflowX: "hidden",
            padding: 4,
            paddingBottom: 100,
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
};
