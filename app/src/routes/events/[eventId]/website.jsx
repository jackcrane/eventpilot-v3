import React from "react";
import { EventPage } from "../../../../components/eventPage/EventPage";
import { WebsiteEditor } from "../../../../components/WebsiteEditor/WebsiteEditor";

export const EventWebsitePage = () => (
  <EventPage
    title="Website"
    description="Use the Puck editor to experiment with your hosted website design. Saving and publishing will be added separately."
    docsLink="https://docs.geteventpilot.com/dashboard/website"
  >
    <WebsiteEditor />
  </EventPage>
);
