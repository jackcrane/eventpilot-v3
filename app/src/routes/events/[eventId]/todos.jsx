import React from "react";
import { EventPage } from "../../../../components/eventPage/EventPage";
import { KanbanBoard } from "../../../../components/KanbanBoard/KanbanBoard";

export const EventTodosPage = () => {
  return (
    <EventPage title="Todo List" description="Organize tasks across statuses.">
      <div style={{ height: "calc(100dvh - 260px)" }}>
        <KanbanBoard />
      </div>
    </EventPage>
  );
};

export default EventTodosPage;
