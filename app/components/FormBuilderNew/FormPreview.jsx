// FormPreview.jsx
import React from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import { Typography, Button, Util, Input, useConfirm } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { Icon } from "../../util/Icon";
import styles from "./FormBuilder.module.css";
import classNames from "classnames";
import { FieldItemPreview } from "./FieldPreview";
import { Empty } from "../empty/Empty";

export const FormPreview = ({
  pages,
  setPages,
  setSelectedFieldLocation,
  setSelectedPageIndex,
  selectedField,
  selectedPage,
}) => {
  const { confirm, ConfirmModal } = useConfirm({
    title: "Are you sure?",
    text: "You are about to delete this. This cannot be undone.",
  });

  const removeField = (pageIndex, fieldIndex) => {
    setPages((prev) =>
      prev.map((p, idx) =>
        idx !== pageIndex
          ? p
          : { ...p, fields: p.fields.filter((_, i) => i !== fieldIndex) }
      )
    );
  };

  return (
    <div className={styles.previewContainer}>
      {ConfirmModal}
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
                    style={{
                      ...prov.draggableProps.style,
                      borderColor:
                        selectedPage?.id === page.id && "var(--tblr-primary)",
                    }}
                  >
                    <Row
                      align="center"
                      className={classNames(styles.pageHeader, "mb-3")}
                      gap={1}
                    >
                      <div {...prov.dragHandleProps} className={styles.handle}>
                        <Icon i="grip-vertical" size={18} />
                      </div>
                      <Typography.H3
                        className="mb-0"
                        style={{ flex: 1, textAlign: "left" }}
                      >
                        {page.name}
                        {page.name?.length === 0 && (
                          <span className="text-muted">(Untitled Page)</span>
                        )}
                      </Typography.H3>
                      <Button
                        size="sm"
                        className="mb-0"
                        onClick={async () => {
                          if (await confirm())
                            setPages((prev) =>
                              prev.filter((p) => p.id !== page.id)
                            );
                        }}
                        variant="danger"
                        outline
                      >
                        <Icon i="trash" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setSelectedPageIndex(pageIndex)}
                      >
                        <Icon i="pencil" />
                      </Button>
                    </Row>

                    <Droppable droppableId={`PAGE-${page.id}`}>
                      {(dropProv, dropSnap) => (
                        <div
                          ref={dropProv.innerRef}
                          {...dropProv.droppableProps}
                          className={classNames(
                            styles.previewPageDropzone,
                            dropSnap.isDraggingOver &&
                              styles.previewPageDropzone_draggedOver,
                            page.fields.length === 0 &&
                              styles.previewPageDropzone_empty
                          )}
                        >
                          {page.fields.length === 0 ? (
                            <>
                              <Empty
                                text="No fields yet. Drag-and-drop a field here from the palette."
                                icon={null}
                                gradient={false}
                              />
                            </>
                          ) : (
                            page.fields.map((field, idx) => (
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
                                        styles.fieldItem_dragged,
                                      selectedField?.id === field.id &&
                                        styles.fieldItem_selected
                                    )}
                                    style={fieldProv.draggableProps.style}
                                  >
                                    <FieldItemPreview
                                      field={field}
                                      dragHandleProps={
                                        fieldProv.dragHandleProps
                                      }
                                      onDelete={async () => {
                                        if (await confirm())
                                          removeField(pageIndex, idx);
                                      }}
                                      onEdit={() =>
                                        setSelectedFieldLocation({
                                          pageIndex,
                                          fieldIndex: idx,
                                        })
                                      }
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))
                          )}

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
                      { id: prev.length, name: "", fields: [] },
                    ])
                  }
                  style={{
                    transform: "translateX(calc(15px / 4))",
                  }}
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
};
