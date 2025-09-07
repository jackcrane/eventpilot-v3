import React from "react";
import { Droppable } from "react-beautiful-dnd";
import styles from "./Column.module.css";
import { Card } from "./Card";
import { Icon } from "../../util/Icon";

const STATUS_ICON = {
  not_started: { i: "circle-filled", color: "#6b7280" }, // gray-500
  in_progress: { i: "circle-filled", color: "#3b82f6" }, // blue-500
  completed: { i: "circle-filled", color: "#10b981" }, // emerald-500
  cancelled: { i: "circle-filled", color: "#ef4444" }, // red-500
};

export const Column = ({ column, count, onAdd, onItemClick }) => (
  <div className={styles.column}>
    <div className={styles.header}>
      <div className={styles.titleWrap}>
        {(() => {
          const cfg = STATUS_ICON[column.id] || STATUS_ICON.not_started;
          return <Icon i={cfg.i} size={14} color={cfg.color} />;
        })()}
        <span className={styles.title}>{column.title}</span>
      </div>
      <div className={styles.right}>
        <button
          type="button"
          className={styles.addBtn}
          title="Add item"
          onClick={() => onAdd?.(column.id)}
        >
          <Icon i="plus" size={14} />
        </button>
        <span className={styles.count}>{count}</span>
      </div>
    </div>
    <Droppable droppableId={column.id}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={styles.droppable}
          data-over={snapshot.isDraggingOver}
        >
          {column.items.map((item, index) => (
            <Card
              key={item.id}
              item={item}
              index={index}
              onClick={onItemClick}
            />
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  </div>
);

export default Column;
