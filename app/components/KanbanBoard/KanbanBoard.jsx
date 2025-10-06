import React, { useEffect, useMemo, useState } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import styles from "./KanbanBoard.module.css";
import { Column } from "./Column";
import { initialColumns as demoColumns, COLUMN_ORDER } from "./kanbanData";

// Public component: <KanbanBoard />
// - Scaffolds 4 columns with drag-and-drop
// - Not connected to data yet; uses local state
export const KanbanBoard = ({ initialColumns, onChange, onMove, onAdd, onItemClick }) => {
  const [columns, setColumns] = useState(
    () => initialColumns || demoColumns
  );

  // sync when external columns change (e.g., after refetch)
  useEffect(() => {
    if (initialColumns) setColumns(initialColumns);
  }, [initialColumns]);

  const counts = useMemo(() =>
    Object.fromEntries(
      Object.entries(columns).map(([k, v]) => [k, v.items.length])
    ),
  [columns]);

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    const srcId = source.droppableId;
    const dstId = destination.droppableId;

    if (srcId === dstId && source.index === destination.index) return;

    setColumns((prev) => {
      const srcColumn = prev[srcId];
      const dstColumn = prev[dstId];
      if (!srcColumn || !dstColumn) return prev;

      if (srcId === dstId) {
        const items = [...srcColumn.items];
        const [moved] = items.splice(source.index, 1);
        if (!moved) return prev;
        items.splice(destination.index, 0, moved);

        const next = {
          ...prev,
          [srcId]: { ...srcColumn, items },
        };
        if (typeof onChange === "function") onChange(next);
        return next;
      }

      const srcItems = [...srcColumn.items];
      const [moved] = srcItems.splice(source.index, 1);
      if (!moved) return prev;
      const movedItem = { ...moved, status: dstId };

      const dstItems = [...dstColumn.items];
      dstItems.splice(destination.index, 0, movedItem);

      const next = {
        ...prev,
        [srcId]: { ...srcColumn, items: srcItems },
        [dstId]: { ...dstColumn, items: dstItems },
      };
      if (typeof onMove === "function") onMove(movedItem, srcId, dstId);
      if (typeof onChange === "function") onChange(next);
      return next;
    });
  };

  return (
    <div className={styles.container}>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className={styles.columnsWrap}>
          {COLUMN_ORDER.map((id) => (
            <Column
              key={id}
              column={columns[id]}
              count={counts[id] || 0}
              onAdd={onAdd}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default KanbanBoard;
