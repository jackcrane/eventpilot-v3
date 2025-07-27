import React from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { Typography } from "tabler-react-2";
import styles from "./FormBuilder.module.css";
import { Row } from "../../util/Flex";
import { Icon } from "../../util/Icon";

export const Palette = ({ requiredTypes = [], inputTypes = [] }) => (
  <Droppable droppableId="PALETTE" isDropDisabled>
    {(provided) => (
      <div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className={styles.paletteContainer}
      >
        {requiredTypes.length > 0 && (
          <>
            <Typography.Text className="mb-2">Required Fields</Typography.Text>
            {requiredTypes.map((type, i) => (
              <Draggable key={type.id} draggableId={type.id} index={i}>
                {(prov, snap) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.draggableProps}
                    {...prov.dragHandleProps}
                    className={styles.paletteItem}
                  >
                    <Row gap={1} align="center">
                      <Icon i={type.icon} size={14} color={type.iconColor} />
                      <Typography.H4 className="mb-0">
                        {type.label}
                      </Typography.H4>
                    </Row>
                    {type.description}
                  </div>
                )}
              </Draggable>
            ))}
          </>
        )}

        <Typography.Text className="mb-2">Drag to add fields</Typography.Text>
        {inputTypes.map((type, index) => (
          <Draggable
            key={type.id}
            draggableId={type.id}
            index={requiredTypes.length + index}
          >
            {(prov, snap) => (
              <div
                ref={prov.innerRef}
                {...prov.draggableProps}
                {...prov.dragHandleProps}
                className={styles.paletteItem}
                style={{
                  ...prov.draggableProps.style,
                  opacity: snap.isDragging ? 0.6 : 1,
                  backgroundColor:
                    type.implemented === false && "var(--tblr-red-lt)",
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
