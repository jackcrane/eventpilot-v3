// ColumnsPicker.jsx
import React from "react";
import { Col, Row } from "../../util/Flex";
import { Icon } from "../../util/Icon";
import { Dropdown } from "../dropdown/Dropdown";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

export const ColumnsPicker = ({ columns, onColumnsChange }) => {
  const handleChange = (id, show) =>
    onColumnsChange(columns.map((c) => (c.id === id ? { ...c, show } : c)));

  const onDragEnd = ({ source, destination }) => {
    if (!destination) return;
    const reordered = Array.from(columns);
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);
    onColumnsChange(reordered.map((c, i) => ({ ...c, order: i + 1 })));
  };

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Dropdown
        prompt={
          <Row gap={1} align="center">
            <Icon i="columns" />
            <span>Columns</span>
          </Row>
        }
      >
        <div style={{ width: 200 }}>
          <Droppable droppableId="columns-picker">
            {(provided) => (
              <Col
                {...provided.droppableProps}
                ref={provided.innerRef}
                align="flex-start"
              >
                {sortedColumns.map((col, idx) => (
                  <Draggable key={col.id} draggableId={col.id} index={idx}>
                    {(prov) => (
                      <Row
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        gap={1}
                        align="center"
                        className={idx === 0 ? "" : "mt-2"}
                      >
                        <Icon
                          i="grip-vertical"
                          {...prov.dragHandleProps}
                          style={{ cursor: "grab" }}
                        />
                        <label
                          className="form-check mb-0"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={col.show}
                            onChange={(e) =>
                              handleChange(col.id, e.target.checked)
                            }
                          />
                          <span
                            className="form-check-label"
                            style={{ textAlign: "left" }}
                          >
                            {col.label}
                          </span>
                        </label>
                      </Row>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Col>
            )}
          </Droppable>
        </div>
      </Dropdown>
    </DragDropContext>
  );
};
