// Palette.jsx
import React from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { Typography } from "tabler-react-2";
import styles from "./FormBuilder.module.css";

export const Palette = ({ inputTypes }) => (
  <Droppable droppableId="PALETTE" isDropDisabled>
    {(provided) => (
      <div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className={styles.paletteContainer}
      >
        <Typography.Text className="mb-2">Drag to add fields</Typography.Text>
        {inputTypes.map((type, index) => (
          <Draggable key={type.id} draggableId={type.id} index={index}>
            {(prov, snap) => (
              <div
                ref={prov.innerRef}
                {...prov.draggableProps}
                {...prov.dragHandleProps}
                className={styles.paletteItem}
                style={{
                  ...prov.draggableProps.style,
                  opacity: snap.isDragging ? 0.6 : 1,
                }}
              >
                {type.label}
              </div>
            )}
          </Draggable>
        ))}
        {provided.placeholder}
      </div>
    )}
  </Droppable>
);
