import React from "react";
import { Input, Checkbox, EnclosedSelectGroup, Button } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { MarkdownEditor } from "../markdown/MarkdownEditor";
import { Icon } from "../../util/Icon";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

export const FieldSettings = ({ field, pageName, onChange, onEditPage }) => {
  const supports = (item) => field.typeDef.supports.includes(item);

  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    // first do your array reorder
    const reordered = reorder(
      field.options,
      result.source.index,
      result.destination.index
    );
    // then re-assign order = array index (or +1 if you prefer 1-based)
    const withOrder = reordered.map((opt, idx) => ({
      ...opt,
      order: idx,
    }));
    onChange("options", withOrder);
  };

  const handleAddOption = () => {
    const maxOrder = (field.options ?? []).reduce(
      (max, o) => Math.max(max, o.order ?? 0),
      0
    );
    const next = maxOrder + 1;
    const newOpt = { id: `${Date.now()}`, label: "", order: next };
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
        <Icon
          i={field.typeDef.icon}
          size={14}
          color={field.typeDef.iconColor}
        />
        {field.typeDef.label}
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
                      {(provided) => (
                        <Row
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          gap={1}
                          align="center"
                          className="mb-2"
                        >
                          <span
                            {...provided.dragHandleProps}
                            style={{ cursor: "grab" }}
                          >
                            <Icon i="grip-vertical" size={18} />
                          </span>
                          <Input
                            style={{ flex: 1 }}
                            className="mb-0"
                            value={option.label}
                            onChange={(e) => {
                              const newOptions = field.options.map((o) =>
                                o.id === option.id ? { ...o, label: e } : o
                              );
                              onChange("options", newOptions);
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
            <Button
              onClick={() => (
                <Button onClick={handleAddOption}>Add Option</Button>
              )}
            >
              Add Option
            </Button>
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
    </div>
  );
};
