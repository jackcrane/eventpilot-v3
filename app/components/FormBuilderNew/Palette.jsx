import React from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { Typography } from "tabler-react-2";
import styles from "./FormBuilder.module.css";
import { Row } from "../../util/Flex";
import { Icon } from "../../util/Icon";

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
                <Row gap={1} align="center">
                  <Icon i={type.icon} size={14} color={type.iconColor} />
                  <Typography.H4 className="mb-0">{type.label}</Typography.H4>
                </Row>
                {type.description}
              </div>
            )}
          </Draggable>
        ))}
        {provided.placeholder}
      </div>
    )}
  </Droppable>
);
