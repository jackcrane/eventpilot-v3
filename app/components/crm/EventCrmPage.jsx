import React from "react";
import { Util } from "tabler-react-2";
import { EventPage } from "../eventPage/EventPage";
import { Empty } from "../empty/Empty";
import { CrmHeaderActions } from "./CrmHeaderActions";
import { CrmFilterBar } from "./CrmFilterBar";
import { CrmImportProgressAlerts } from "./CrmImportProgressAlerts";
import { CrmPersonsTable } from "./CrmPersonsTable";
import { useEventCrmPageState } from "../../hooks/useEventCrmPageState";

export const EventCrmPage = ({ eventId }) => {
  const state = useEventCrmPageState({ eventId });

  return (
    <EventPage
      title="CRM"
      loading={state.eventPage.loading}
      docsLink={state.eventPage.docsLink}
      description={state.eventPage.description}
    >
      {state.OffcanvasElement}
      {state.CreateCrmFieldModalElement}

      <CrmHeaderActions {...state.headerProps} />

      <Util.Hr style={{ margin: "1rem 0" }} />

      <CrmFilterBar {...state.filterProps} />

      {state.shouldShowEmpty && (
        <Empty text="You don't have any CRM responses yet." />
      )}

      <CrmImportProgressAlerts imports={state.imports} />

      <CrmPersonsTable {...state.tableProps} />
    </EventPage>
  );
};
