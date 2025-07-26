import React from "react";
import { Input, Checkbox, EnclosedSelectGroup, Button } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { MarkdownEditor } from "../markdown/MarkdownEditor";
import { Icon } from "../../util/Icon";

export const FieldSettings = ({ field, pageName, onChange, onEditPage }) => {
  const supports = (item) => field.typeDef.supports.includes(item);

  return (
    <div>
      <Row gap={1} align="center" className="mb-3">
        <span
          className="text-primary"
          onClick={onEditPage}
          style={{
            cursor: "pointer",
            textDecoration: "underline",
          }}
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
          value={field.rows || ""}
          onInput={(e) => onChange("rows", e)}
          type="number"
        />
      )}
      {supports("options") && (
        <div className="mb-3">
          <label className="form-label">Options</label>
          {field.options?.map((option) => (
            <Row key={option.id} gap={1} align="flex-end" className="mb-2">
              <Input
                style={{ flex: 1 }}
                className={"mb-0"}
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
                className={"mb-0"}
              >
                <Icon i="trash" />
              </Button>
            </Row>
          ))}
          <Row gap={1} justify="flex-start" className="mb-3">
            <Button
              onClick={() =>
                onChange("options", [
                  ...(field.options ?? []),
                  { id: `option-${Date.now()}`, label: "" },
                ])
              }
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
