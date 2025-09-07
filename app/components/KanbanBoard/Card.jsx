import React from "react";
import { Draggable } from "react-beautiful-dnd";
import styles from "./Card.module.css";
import { Icon } from "../../util/Icon";

export const Card = ({ item, index, onClick }) => (
  <Draggable draggableId={item.id} index={index}>
    {(provided, snapshot) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        className={styles.card}
        data-dragging={snapshot.isDragging}
        style={provided.draggableProps.style}
        data-item={item}
      >
        <div
          {...provided.dragHandleProps}
          className={styles.handle}
          onClick={(e) => e.stopPropagation()}
          title="Drag"
        >
          <Icon i="grip-vertical" size={16} />
        </div>
        <div className={styles.content} onClick={() => onClick?.(item)}>
          <div className={styles.title}>{item.title}</div>
          {item.subtitle && (
            <div className={styles.subtitle}>{item.subtitle}</div>
          )}
        </div>
      </div>
    )}
  </Draggable>
);

export default Card;
