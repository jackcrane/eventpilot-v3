import React, { useEffect, useMemo, useState } from "react";
import { EventPage } from "../../../../components/eventPage/EventPage";
import { KanbanBoard } from "../../../../components/KanbanBoard/KanbanBoard";
import { useParams } from "react-router-dom";
import { useTodos } from "../../../../hooks/useTodos";
import { Icon } from "../../../../util/Icon";
import {
  Button,
  Input,
  Typography,
  useOffcanvas,
  DropdownInput,
  Badge,
} from "tabler-react-2";
// Inline item panel extracted to components/TodoItemRUD
import { TodoItemRUD } from "../../../../components/TodoItemRUD/TodoItemRUD";
import { TodoCreateForm } from "../../../../components/TodoCreateForm/TodoCreateForm";

const TITLE_MAP = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const buildColumnsFromTodos = (todos) => {
  const base = {
    not_started: {
      id: "not_started",
      title: TITLE_MAP.not_started,
      items: [],
    },
    in_progress: {
      id: "in_progress",
      title: TITLE_MAP.in_progress,
      items: [],
    },
    completed: { id: "completed", title: TITLE_MAP.completed, items: [] },
    cancelled: { id: "cancelled", title: TITLE_MAP.cancelled, items: [] },
  };

  for (const t of todos || []) {
    const statusKey = (t.status || "NOT_STARTED").toLowerCase();
    const key = base[statusKey] ? statusKey : "not_started";
    const commentCount = Array.isArray(t?.comments) ? t.comments.length : 0;
    const volunteerCount = Array.isArray(t?.VolunteerRegistration)
      ? t.VolunteerRegistration.length
      : 0;
    const crmCount = Array.isArray(t?.CrmPerson) ? t.CrmPerson.length : 0;
    const registrationCount = Array.isArray(t?.Registration)
      ? t.Registration.length
      : 0;

    const badges = [];
    if (commentCount > 0)
      badges.push(
        <Badge key="comments" soft color="blue">
          <Icon i="message-circle" /> {commentCount}
        </Badge>
      );
    if (volunteerCount > 0)
      badges.push(
        <Badge key="volunteers" soft color="red">
          <Icon i="heart" /> {volunteerCount}
        </Badge>
      );
    if (crmCount > 0)
      badges.push(
        <Badge key="crm" soft color="purple">
          <Icon i="user" /> {crmCount}
        </Badge>
      );
    if (registrationCount > 0)
      badges.push(
        <Badge key="registrations" soft color="orange">
          <Icon i="ticket" /> {registrationCount}
        </Badge>
      );

    base[key].items.push({
      id: t.id,
      title: t.title,
      subtitle:
        badges.length > 0 ? (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {badges}
          </div>
        ) : undefined,
      status: key,
    });
  }

  return base;
};

export const EventTodosPage = () => {
  const { eventId } = useParams();
  const { todos, loading, updateTodo, createTodo } = useTodos({ eventId });
  const { offcanvas, OffcanvasElement, close } = useOffcanvas({
    offcanvasProps: { position: "end", size: 470, zIndex: 1051 },
  });

  const baseColumns = useMemo(
    () => buildColumnsFromTodos(todos),
    [todos]
  );
  const [kanbanColumns, setKanbanColumns] = useState(baseColumns);

  useEffect(() => {
    setKanbanColumns((prev) => {
      if (!prev) return baseColumns;
      const merged = {};
      for (const key of Object.keys(baseColumns)) {
        const incoming = baseColumns[key] || { id: key, items: [] };
        const prevColumn = prev[key] || incoming;
        const nextItemsMap = new Map(
          (incoming.items || []).map((item) => [item.id, item])
        );
        const ordered = [];

        for (const item of prevColumn.items || []) {
          const nextItem = nextItemsMap.get(item.id);
          if (nextItem) {
            ordered.push(nextItem);
            nextItemsMap.delete(item.id);
          }
        }

        for (const item of incoming.items || []) {
          if (nextItemsMap.has(item.id)) {
            ordered.push(item);
            nextItemsMap.delete(item.id);
          }
        }

        merged[key] = { ...incoming, items: ordered };
      }
      return merged;
    });
  }, [baseColumns]);

  useEffect(() => {
    if (!kanbanColumns) setKanbanColumns(baseColumns);
  }, [baseColumns, kanbanColumns]);

  const handleMove = async (item, fromId, toId) => {
    if (!item?.id || fromId === toId) return;
    const serverStatus = toId.toUpperCase();
    await updateTodo(item.id, { status: serverStatus });
  };

  const openCreate = (statusKey) => {
    offcanvas({
      content: (
        <TodoCreateForm
          initialStatus={statusKey}
          onClose={close}
          onCreate={async (vals) => {
            const ok = await createTodo(vals);
            if (ok) close();
          }}
        />
      ),
    });
  };

  return (
    <EventPage title="Todo List" description="Organize tasks across statuses.">
      {OffcanvasElement}
      <div style={{ height: "calc(100dvh - 260px)" }}>
        {loading ? (
          <div style={{ padding: 16 }}>Loading...</div>
        ) : (
          <KanbanBoard
            key={eventId}
            initialColumns={kanbanColumns || baseColumns}
            onMove={handleMove}
            onChange={setKanbanColumns}
            onAdd={(colId) => openCreate(colId)}
            onItemClick={(item) =>
              offcanvas({
                content: (
                  <TodoItemRUD
                    eventId={eventId}
                    todoId={item.id}
                    onClose={close}
                  />
                ),
              })
            }
          />
        )}
      </div>
    </EventPage>
  );
};

export default EventTodosPage;
