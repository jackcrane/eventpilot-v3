import React from "react";
import { Input, Checkbox, SegmentedControl } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { MarkdownEditor } from "../markdown/MarkdownEditor";

export const FieldSettings = ({ field, onChange }) => {
  const supports = (item) => field.typeDef.supports.includes(item);

  return (
    <div>
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
