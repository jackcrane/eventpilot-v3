import React, { useState } from "react";
import { Input, Checkbox, Typography, Button, Util } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { MarkdownEditor } from "../markdown/MarkdownEditor";
import { Icon } from "../../util/Icon";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { inputTypes } from "./InputTypes";
import styles from "./FormBuilder.module.css";

export const FieldSettings = ({ field, pageName, onChange, onEditPage }) => {
  const [lastAddedId, setLastAddedId] = useState(null);

  const typeDef = inputTypes.find((t) => t.id === field.type);
  const supports = (item) => typeDef.supports.includes(item);

  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const handleDragEnd = ({ destination, source }) => {
    if (!destination) return;
    const reordered = reorder(
      field.options,
      source.index,
      destination.index
    ).map((opt, idx) => ({ ...opt, order: idx }));
    onChange("options", reordered);
  };

  const handleAddOption = () => {
    const maxOrder = (field.options ?? []).reduce(
      (max, o) => Math.max(max, o.order ?? 0),
      0
    );
    const nextOrder = maxOrder + 1;
    const newOpt = { id: `${Date.now()}`, label: "", order: nextOrder };
    setLastAddedId(newOpt.id);
    onChange("options", [...(field.options ?? []), newOpt]);
  };

  return (
    <div>
      <Row gap={1} align="center" className="mb-3">
        <span
          className="text-primary"
          onClick={onEditPage}
          style={{ cursor: "pointer", textDecoration: "underline" }}
        >
          {pageName || <i className="text-muted">Untitled Page</i>}
        </span>
        <Icon i="chevron-right" size={12} />
        <Icon i={typeDef.icon} size={14} color={typeDef.iconColor} />
        {typeDef.label}
      </Row>

      {supports("label") && (
        <Input
          label="Label"
          value={field.label || ""}
          onInput={(e) => onChange("label", e)}
        />
      )}
      {supports("placeholder") && (
        <Input
          label="Placeholder"
          value={field.placeholder || ""}
          onInput={(e) => onChange("placeholder", e)}
        />
      )}
      {supports("prompt") && (
        <Input
          label="Prompt"
          value={field.prompt || ""}
          onInput={(e) => onChange("prompt", e)}
        />
      )}
      {supports("description") && (
        <Input
          label="Description"
          value={field.description || ""}
          onInput={(e) => onChange("description", e)}
        />
      )}
      {supports("rows") && (
        <Input
          label="Rows"
          type="number"
          value={field.rows?.toString() || ""}
          onInput={(e) => onChange("rows", parseInt(e, 10))}
        />
      )}

      {supports("options") && (
        <div className="mb-3">
          <label className="form-label">Options</label>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="options">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {field.options.map((option, index) => (
                    <Draggable
                      key={option.id}
                      draggableId={option.id.toString()}
                      index={index}
                    >
                      {(dragProvided) => (
                        <Row
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          gap={1}
                          align="center"
                          className="mb-2"
                        >
                          <span
                            {...dragProvided.dragHandleProps}
                            style={{ cursor: "grab" }}
                          >
                            <Icon i="grip-vertical" size={18} />
                          </span>
                          <Input
                            style={{ flex: 1 }}
                            className="mb-0"
                            autoFocus={option.id === lastAddedId}
                            value={option.label}
                            onRawChange={({ target: { value } }) => {
                              const newOptions = field.options.map((o) =>
                                o.id === option.id ? { ...o, label: value } : o
                              );
                              onChange("options", newOptions);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddOption();
                              }
                            }}
                          />
                          <Button
                            outline
                            variant="danger"
                            onClick={() => {
                              const newOptions = field.options.filter(
                                (o) => o.id !== option.id
                              );
                              onChange("options", newOptions);
                            }}
                            className="mb-0"
                          >
                            <Icon i="trash" />
                          </Button>
                        </Row>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <Row gap={1} justify="flex-start" className="mt-2">
            <Button onClick={handleAddOption}>Add Option</Button>
          </Row>
        </div>
      )}

      {supports("required") && (
        <div>
          <label className="form-label">Field Required</label>
          <Checkbox
            label="Required"
            value={field.required}
            onChange={(v) => onChange("required", v)}
          />
        </div>
      )}

      {supports("markdown") && (
        <MarkdownEditor
          value={field.markdown || ""}
          onChange={(v) => onChange("markdown", v)}
        />
      )}

      {field.fieldType && (
        <>
          <Util.Hr />
          <div style={{ display: "inline-block" }} className="mb-2">
            <Row
              gap={0.5}
              align="center"
              className={styles.requiredFieldAdmonition}
            >
              <Icon i="asterisk" size={12} />
              <Typography.Text className="mb-0">
                This field must be present in your form
              </Typography.Text>
            </Row>
          </div>
          <br />
          <Typography.B>
            This field is required to be present in your form.
          </Typography.B>
          <Typography.Text>
            This means that EventPilot requires this field to be present in your
            form. We do this to ensure that our system is able to collect the
            required information so we can do what we need to do on your behalf.
          </Typography.Text>
        </>
      )}
    </div>
  );
};
