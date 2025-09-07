import React from "react";
import { Droppable } from "react-beautiful-dnd";
import styles from "./Column.module.css";
import { Card } from "./Card";

export const Column = ({ column, count }) => (
  <div className={styles.column}>
    <div className={styles.header}>
      <span className={styles.title}>{column.title}</span>
      <span className={styles.count}>{count}</span>
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

