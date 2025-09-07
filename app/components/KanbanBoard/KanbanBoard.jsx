import React, { useEffect, useMemo, useState } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import styles from "./KanbanBoard.module.css";
import { Column } from "./Column";
import { initialColumns as demoColumns, COLUMN_ORDER } from "./kanbanData";

// Public component: <KanbanBoard />
// - Scaffolds 4 columns with drag-and-drop
// - Not connected to data yet; uses local state
export const KanbanBoard = ({ initialColumns, onChange, onMove, onAdd }) => {
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
      const next = JSON.parse(JSON.stringify(prev));
      const srcItems = Array.from(next[srcId].items);
      const [moved] = srcItems.splice(source.index, 1);

      // update status on move across columns
      if (srcId !== dstId) moved.status = dstId;

      const dstItems = srcId === dstId ? srcItems : Array.from(next[dstId].items);
      dstItems.splice(destination.index, 0, moved);

      next[srcId].items = srcId === dstId ? dstItems : srcItems;
      if (srcId !== dstId) next[dstId].items = dstItems;
      // external change hook for future wiring
      if (typeof onMove === "function" && srcId !== dstId) onMove(moved, srcId, dstId);
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
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default KanbanBoard;
