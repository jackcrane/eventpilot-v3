import React from "react";
import { Droppable } from "react-beautiful-dnd";
import styles from "./Column.module.css";
import { Card } from "./Card";
import { Icon } from "../../util/Icon";

export const Column = ({ column, count, onAdd }) => (
  <div className={styles.column}>
    <div className={styles.header}>
      <span className={styles.title}>{column.title}</span>
      <div className={styles.right}>
        <span className={styles.count}>{count}</span>
        <button
          type="button"
          className={styles.addBtn}
          title="Add item"
          onClick={() => onAdd?.(column.id)}
        >
          <Icon i="plus" size={14} />
        </button>
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
            <Card key={item.id} item={item} index={index} />
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  </div>
);

export default Column;
