// FormPreview.jsx
import React from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { Typography, Button, Util } from "tabler-react-2";
import { Row } from "../../util/Flex";
import styles from "./FormBuilder.module.css";

export const FormPreview = ({ pages, setPages }) => (
  <div className={styles.previewContainer}>
    {pages.map((page) => (
      <Droppable droppableId={`PAGE-${page.id}`} key={page.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={styles.previewPage}
            style={{
              backgroundColor: snapshot.isDraggingOver ? "#fed7d7" : undefined,
            }}
          >
            <Row justify="space-between" align="center" className="mb-2">
              <Typography.Text>
                <strong>{page.name}</strong>
              </Typography.Text>
            </Row>

            {page.fields.map((field, idx) => (
              <Draggable key={field.id} draggableId={field.id} index={idx}>
                {(prov, snap) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.draggableProps}
                    {...prov.dragHandleProps}
                    className={styles.fieldItem}
                    style={{
                      ...prov.draggableProps.style,
                      opacity: snap.isDragging ? 0.6 : 1,
                    }}
                  >
                    {field.label}
                  </div>
                )}
              </Draggable>
            ))}

            {provided.placeholder}
          </div>
        )}
      </Droppable>
    ))}

    <Util.Hr
      text={
        <Button
          size="sm"
          onClick={() =>
            setPages((prev) => [
              ...prev,
              {
                id: prev.length,
                name: `Page ${prev.length + 1}`,
                fields: [],
              },
            ])
          }
        >
          Add Page
        </Button>
      }
    />
  </div>
);
