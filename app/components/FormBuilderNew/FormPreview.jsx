// FormPreview.jsx
import React from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { Typography, Button, Util, Input } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { Icon } from "../../util/Icon";
import styles from "./FormBuilder.module.css";
import classNames from "classnames";
import { FieldItemPreview } from "./FieldPreview";

export const FormPreview = ({ pages, setPages }) => (
  <div className={styles.previewContainer}>
    <Droppable droppableId="PAGE_LIST" type="PAGE">
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps}>
          {pages.map((page, pageIndex) => (
            <Draggable
              key={page.id}
              draggableId={`PAGE-${page.id}`}
              index={pageIndex}
            >
              {(prov, snap) => (
                <div
                  ref={prov.innerRef}
                  {...prov.draggableProps}
                  className={classNames(
                    styles.previewPage,
                    snap.isDragging && styles.previewPage_dragged
                  )}
                  style={prov.draggableProps.style}
                >
                  {/* PAGE HEADER WITH HANDLE */}
                  <Row
                    align="center"
                    className={classNames(styles.pageHeader, "mb-3")}
                    gap={1}
                  >
                    <div {...prov.dragHandleProps} className={styles.handle}>
                      <Icon i="grip-vertical" size={18} />
                    </div>
                    <Input
                      value={page.name}
                      onChange={() => null}
                      size="sm"
                      placeholder="Page Name"
                      className="mb-0"
                      style={{ flex: 1 }}
                    />
                    <Button
                      size="sm"
                      className="mb-0"
                      onClick={() =>
                        setPages((prev) => prev.filter((p) => p.id !== page.id))
                      }
                    >
                      Delete Page
                    </Button>
                  </Row>

                  {/* FIELDS DROPZONE */}
                  <Droppable droppableId={`PAGE-${page.id}`}>
                    {(dropProv, dropSnap) => (
                      <div
                        ref={dropProv.innerRef}
                        {...dropProv.droppableProps}
                        className={classNames(
                          styles.previewPageDropzone,
                          dropSnap.isDraggingOver &&
                            styles.previewPageDropzone_draggedOver
                        )}
                      >
                        {page.fields.map((field, idx) => (
                          <Draggable
                            key={field.id}
                            draggableId={field.id}
                            index={idx}
                          >
                            {(fieldProv, fieldSnap) => (
                              <div
                                ref={fieldProv.innerRef}
                                {...fieldProv.draggableProps}
                                className={classNames(
                                  styles.fieldItem,
                                  fieldSnap.isDragging &&
                                    styles.fieldItem_dragged
                                )}
                                style={fieldProv.draggableProps.style}
                              >
                                <FieldItemPreview
                                  field={field}
                                  dragHandleProps={fieldProv.dragHandleProps}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}

                        {dropProv.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )}
            </Draggable>
          ))}

          {provided.placeholder}
          <Util.Hr
            text={
              <Button
                size="sm"
                onClick={() =>
                  setPages((prev) => [
                    ...prev,
                    { id: prev.length, name: ``, fields: [] },
                  ])
                }
              >
                Add Page
              </Button>
            }
          />
        </div>
      )}
    </Droppable>
  </div>
);
