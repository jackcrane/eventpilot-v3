import React from "react";
import { Draggable } from "react-beautiful-dnd";
import styles from "./Card.module.css";

export const Card = ({ item, index }) => (
  <Draggable draggableId={item.id} index={index}>
    {(provided, snapshot) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className={styles.card}
        data-dragging={snapshot.isDragging}
      >
        <div className={styles.title}>{item.title}</div>
        {item.subtitle && <div className={styles.subtitle}>{item.subtitle}</div>}
      </div>
    )}
  </Draggable>
);

export default Card;

